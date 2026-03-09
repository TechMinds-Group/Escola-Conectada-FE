import { Routes } from '@angular/router';
import { AuthService, ROLES } from './core/services/auth.service';
import { MainLayout } from './layout/main-layout/main-layout';
import { CadastroMateria } from './pages/materia/cadastro-materia/cadastro-materia';
import { ConsultaConfiguracao } from './pages/consulta-configuracao/consulta-configuracao';
import { ConsultaMateria } from './pages/materia/consulta-materia/consulta-materia';
import { ConsultaProfessor } from './pages/professor/consulta-professor/consulta-professor';
import { CadastroProfessor } from './pages/professor/cadastro-professor/cadastro-professor';
import { Dashboard } from './pages/dashboard/dashboard';
import { Structure } from './pages/structure/structure';
import { Timetable } from './pages/timetable/timetable';
import { ConsultaMatrizEscolarPage } from './pages/matriz-escolar/consulta-matriz-escolar/consulta-matriz-escolar';
import { CadastroMatrizEscolarPage } from './pages/matriz-escolar/cadastro-matriz-escolar/cadastro-matriz-escolar';
import { ConsultaTurma } from './pages/turma/consulta-turma/consulta-turma';
import { CadastroTurma } from './pages/turma/cadastro-turma/cadastro-turma';
import { ReservasSalas } from './pages/reservas-salas/reservas-salas';

import { ConsultaAmbiente } from './pages/ambientes/consulta-ambiente/consulta-ambiente';
import { CadastroAmbiente } from './pages/ambientes/cadastro-ambiente/cadastro-ambiente';
import { ConsultaCalendario } from './pages/calendario/consulta-calendario/consulta-calendario';
import { ConsultaGrade } from './pages/administrativo/grades/consulta-grade/consulta-grade';
import { CadastroGrade } from './pages/administrativo/grades/cadastro-grade/cadastro-grade';

import { PublicView } from './pages/public/view/public-view';
import { ConfiguracaoTV } from './pages/administrativo/configuracao-tv/configuracao-tv';

import { authGuard } from './core/guards/auth.guard';
import { Login } from './pages/auth/login/login';

export const routes: Routes = [
  {
    path: 'login',
    component: Login,
  },
  {
    path: '',
    component: MainLayout,
    canActivate: [authGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        component: Dashboard,
        data: { roles: [ROLES.ADMIN] },
      },
      { path: 'timetable', component: Timetable, data: { roles: [ROLES.ADMIN] } },
      { path: 'professores', component: ConsultaProfessor, data: { roles: [ROLES.ADMIN] } },
      { path: 'professores/novo', component: CadastroProfessor, data: { roles: [ROLES.ADMIN] } },
      {
        path: 'professores/editar/:id',
        component: CadastroProfessor,
        data: { roles: [ROLES.ADMIN] },
      },
      { path: 'subjects', component: ConsultaMateria, data: { roles: [ROLES.ADMIN] } },
      { path: 'subjects/new', component: CadastroMateria, data: { roles: [ROLES.ADMIN] } },
      { path: 'subjects/edit/:id', component: CadastroMateria, data: { roles: [ROLES.ADMIN] } },
      {
        path: 'school-matrices',
        component: ConsultaMatrizEscolarPage,
        data: { roles: [ROLES.ADMIN] },
      },
      {
        path: 'school-matrices/new',
        component: CadastroMatrizEscolarPage,
        data: { roles: [ROLES.ADMIN] },
      },
      {
        path: 'school-matrices/edit/:id',
        component: CadastroMatrizEscolarPage,
        data: { roles: [ROLES.ADMIN] },
      },
      // Redirects for backward compatibility
      { path: 'consulta-matriz-escolar', redirectTo: 'school-matrices', pathMatch: 'full' },
      { path: 'cadastro-matriz-escolar', redirectTo: 'school-matrices/new', pathMatch: 'full' },
      {
        path: 'cadastro-matriz-escolar/:id',
        redirectTo: 'school-matrices/edit/:id',
        pathMatch: 'full',
      },
      { path: 'structure', component: Structure, data: { roles: [ROLES.ADMIN] } },
      {
        path: 'consulta-configuracao',
        component: ConsultaConfiguracao,
        data: { roles: [ROLES.ADMIN] },
      },
      { path: 'tv-settings', component: ConfiguracaoTV, data: { roles: [ROLES.ADMIN] } },
      // Grades de Horário
      { path: 'time-grids', component: ConsultaGrade, data: { roles: [ROLES.ADMIN] } },
      { path: 'time-grids/new', component: CadastroGrade, data: { roles: [ROLES.ADMIN] } },
      { path: 'time-grids/edit/:id', component: CadastroGrade, data: { roles: [ROLES.ADMIN] } },
      // Turmas
      { path: 'classes', component: ConsultaTurma, data: { roles: [ROLES.ADMIN] } },
      { path: 'classes/new', component: CadastroTurma, data: { roles: [ROLES.ADMIN] } },
      { path: 'classes/edit/:id', component: CadastroTurma, data: { roles: [ROLES.ADMIN] } },
      {
        path: 'reservas-salas',
        component: ReservasSalas,
        data: { roles: [ROLES.ADMIN, ROLES.PROFESSOR] },
      },
      // Calendário do Professor
      {
        path: 'calendario-professor',
        data: { roles: [ROLES.ADMIN, ROLES.PROFESSOR] },
        loadComponent: () =>
          import('./pages/professor/calendario-professor/calendario-professor.component').then(
            (m) => m.CalendarioProfessorComponent,
          ),
      },
      // Ambientes
      { path: 'ambientes', component: ConsultaAmbiente, data: { roles: [ROLES.ADMIN] } },
      { path: 'ambientes/new', component: CadastroAmbiente, data: { roles: [ROLES.ADMIN] } },
      { path: 'ambientes/edit/:id', component: CadastroAmbiente, data: { roles: [ROLES.ADMIN] } },
      { path: 'events', component: ConsultaCalendario, data: { roles: [ROLES.ADMIN] } },
      // Avisos
      {
        path: 'avisos',
        data: { roles: [ROLES.ADMIN] },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/avisos/consulta-avisos/consulta-avisos').then(
                (m) => m.ConsultaAvisos,
              ),
          },
          {
            path: 'new',
            loadComponent: () =>
              import('./pages/avisos/cadastro-avisos/cadastro-avisos').then(
                (m) => m.CadastroAvisos,
              ),
          },
          {
            path: 'edit/:id',
            loadComponent: () =>
              import('./pages/avisos/cadastro-avisos/cadastro-avisos').then(
                (m) => m.CadastroAvisos,
              ),
          },
        ],
      },
      // Admin
      {
        path: 'users',
        data: { roles: [ROLES.ADMIN] },
        children: [
          {
            path: '',
            loadComponent: () =>
              import('./pages/admin/user-management/consulta-usuario/consulta-usuario').then(
                (m) => m.ConsultaUsuario,
              ),
          },
          {
            path: 'novo',
            loadComponent: () =>
              import('./pages/admin/user-management/cadastro-usuario/cadastro-usuario').then(
                (m) => m.CadastroUsuario,
              ),
          },
          {
            path: 'editar/:id',
            loadComponent: () =>
              import('./pages/admin/user-management/cadastro-usuario/cadastro-usuario').then(
                (m) => m.CadastroUsuario,
              ),
          },
        ],
      },
      {
        path: 'school-settings',
        data: { roles: [ROLES.ADMIN] },
        loadComponent: () =>
          import('./pages/admin/school-settings/school-settings').then((m) => m.SchoolSettings),
      },
      {
        path: 'profile',
        data: { roles: [ROLES.ADMIN, ROLES.PROFESSOR] },
        loadComponent: () =>
          import('./pages/admin/user-profile/user-profile').then((m) => m.UserProfile),
      },
      {
        path: 'licensing',
        data: { roles: [ROLES.ADMIN] },
        loadComponent: () =>
          import('./pages/admin/licensing/licensing-management').then((m) => m.LicensingManagement),
      },
    ],
  },
  { path: 'view', component: PublicView },
  {
    path: 'ativar-licenca',
    loadComponent: () =>
      import('./pages/ativar-licenca/ativar-licenca.component').then(
        (m) => m.AtivarLicencaComponent,
      ),
  },
  { path: '**', redirectTo: 'dashboard' },
];
