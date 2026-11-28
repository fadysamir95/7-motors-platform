import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { createHash } from 'crypto';
import { AuditService } from '../audit/audit.service';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

/** Staff sessions are short: a stolen admin token stops working after 12 hours. Customers keep 7 days. */
const STAFF_TOKEN_TTL = '12h';
const CUSTOMER_TOKEN_TTL = '7d';

/** Compared against when the e-mail is unknown, so a wrong e-mail and a wrong password take the same time to answer. */
const TIMING_HASH = bcrypt.hashSync('timing-equaliser', 10);

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwt: JwtService,
    private config: ConfigService,
    private audit: AuditService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new ConflictException('Email already in use');
    const passwordHash = await bcrypt.hash(dto.password, 10);
    // User and CustomerProfile are created atomically.
    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        passwordHash,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        customerProfile: {
          create: {
            fullName: [dto.firstName, dto.lastName].filter(Boolean).join(' ') || dto.email.split('@')[0],
            phone: dto.phone ?? '',
          },
        },
      },
    });
    return this.issueToken(user.id, user.email, []);
  }

  async login(dto: LoginDto, ip?: string) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
      include: { roles: { include: { role: true } } },
    });
    const ok = await bcrypt.compare(dto.password, user?.passwordHash ?? TIMING_HASH);
    if (!user || !ok) {
      // The e-mail is stored hashed: enough to spot an attack on one account, not a list of addresses.
      void this.audit
        .log(user?.id, 'auth.login_failed', 'Auth', undefined, { ip, emailHash: createHash('sha256').update(dto.email.toLowerCase()).digest('hex').slice(0, 16) })
        .catch(() => undefined);
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.isActive) throw new UnauthorizedException('Account disabled');
    const roles = user.roles.map((r) => r.role.name);
    if (roles.length) void this.audit.log(user.id, 'auth.login', 'Auth', undefined, { ip }).catch(() => undefined);
    return this.issueToken(user.id, user.email, roles);
  }

  private async issueToken(userId: string, email: string, roles: string[]) {
    const token = await this.jwt.signAsync({ sub: userId, email, roles }, { expiresIn: roles.length ? STAFF_TOKEN_TTL : CUSTOMER_TOKEN_TTL });
    return { accessToken: token, user: { id: userId, email, roles } };
  }

  async me(userId: string) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, roles: { include: { role: true } } },
    });
  }
}
