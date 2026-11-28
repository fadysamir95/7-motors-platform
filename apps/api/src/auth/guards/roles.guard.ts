import { Injectable, CanActivate, ExecutionContext, ForbiddenException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { AuditService } from '../../audit/audit.service';

/**
 * Allows a request only if the signed-in user holds one of the roles named by @Roles(...).
 * It fails closed: a route that uses this guard without naming any role is refused for everybody, so a forgotten
 * @Roles can never turn a staff route into an open one.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  private readonly logger = new Logger(RolesGuard.name);
  constructor(private reflector: Reflector, private audit: AuditService) {}
  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(ROLES_KEY, [context.getHandler(), context.getClass()]);
    if (!requiredRoles || requiredRoles.length === 0) throw new ForbiddenException('This route has no allowed roles');
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    if (!user || !user.roles) throw new ForbiddenException();
    const hasRole = requiredRoles.some((role) => user.roles.includes(role));
    if (!hasRole) {
      // A signed-in account reaching for something its role does not allow is worth a record: it is how probing shows up.
      this.audit
        .log(user.id, `${request.method} ${request.baseUrl ?? ''}${request.route?.path ?? request.path}`, context.getClass().name.replace(/Controller$/, ''), request.params?.id ?? request.params?.productId, {
          outcome: 'denied',
          ip: request.ip,
          needed: requiredRoles,
        })
        .catch((e: unknown) => this.logger.warn(`audit write failed: ${e instanceof Error ? e.message : e}`));
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
