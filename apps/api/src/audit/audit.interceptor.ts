import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { AuditService } from './audit.service';
import { isStaff } from '../auth/staff-roles';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

/**
 * Leaves a trail of what staff change: every successful write by a staff member. (Refusals are recorded by the roles
 * guard, which runs before interceptors.) Only field NAMES of the body are stored, never values, so the log cannot
 * leak personal data or secrets. Logging can never break a request.
 */
@Injectable()
export class AuditInterceptor implements NestInterceptor {
  private readonly logger = new Logger(AuditInterceptor.name);
  constructor(private audit: AuditService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    if (context.getType() !== 'http') return next.handle();
    const req = context.switchToHttp().getRequest();
    if (!MUTATING.has(req.method) || String(req.path).startsWith('/auth/')) return next.handle();
    const entity = context.getClass().name.replace(/Controller$/, '');
    return next.handle().pipe(
      tap(() => {
        if (isStaff(req.user?.roles)) this.record(req, entity, 'ok');
      }),
    );
  }

  private record(req: Record<string, any>, entity: string, outcome: 'ok') {
    const route = `${req.baseUrl ?? ''}${req.route?.path ?? req.path}`;
    this.audit
      .log(req.user?.id, `${req.method} ${route}`, entity, req.params?.id ?? req.params?.productId, {
        outcome,
        ip: req.ip,
        bodyFields: req.body && typeof req.body === 'object' ? Object.keys(req.body).slice(0, 40) : [],
      })
      .catch((e: unknown) => this.logger.warn(`audit write failed: ${e instanceof Error ? e.message : e}`));
  }
}
