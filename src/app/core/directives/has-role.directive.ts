import { Directive, Input, TemplateRef, ViewContainerRef, inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

/**
 * Structural directive to conditionally show elements based on user roles.
 * Usage: *hasRole="'Administrador'" or *hasRole="['Administrador', 'Professor']"
 */
@Directive({
  selector: '[hasRole]',
  standalone: true,
})
export class HasRoleDirective {
  private authService = inject(AuthService);
  private templateRef = inject(TemplateRef<any>);
  private viewContainer = inject(ViewContainerRef);

  @Input() set hasRole(role: string | string[]) {
    const roles = Array.isArray(role) ? role : [role];

    if (this.authService.hasAnyRole(roles)) {
      this.viewContainer.createEmbeddedView(this.templateRef);
    } else {
      this.viewContainer.clear();
    }
  }
}
