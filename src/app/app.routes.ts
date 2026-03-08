import { Routes } from '@angular/router';
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
      { path: 'dashboard', component: Dashboard },
      { path: 'timetable', component: Timetable },
      { path: 'professores', component: ConsultaProfessor },
      { path: 'professores/novo', component: CadastroProfessor },
      { path: 'professores/editar/:id', component: CadastroProfessor },
      { path: 'subjects', component: ConsultaMateria },
      { path: 'subjects/new', component: CadastroMateria },
      { path: 'subjects/edit/:id', component: CadastroMateria },
      { path: 'school-matrices', component: ConsultaMatrizEscolarPage },
      { path: 'school-matrices/new', component: CadastroMatrizEscolarPage },
      { path: 'school-matrices/edit/:id', component: CadastroMatrizEscolarPage },
      // Redirects for backward compatibility
      { path: 'consulta-matriz-escolar', redirectTo: 'school-matrices', pathMatch: 'full' },
      { path: 'cadastro-matriz-escolar', redirectTo: 'school-matrices/new', pathMatch: 'full' },
      {
        path: 'cadastro-matriz-escolar/:id',
        redirectTo: 'school-matrices/edit/:id',
        pathMatch: 'full',
      },
      { path: 'structure', component: Structure },
      { path: 'consulta-configuracao', component: ConsultaConfiguracao },
      { path: 'tv-settings', component: ConfiguracaoTV },
      // Grades de Horário
      { path: 'time-grids', component: ConsultaGrade },
      { path: 'time-grids/new', component: CadastroGrade },
      { path: 'time-grids/edit/:id', component: CadastroGrade },
      // Turmas
      { path: 'classes', component: ConsultaTurma },
      { path: 'classes/new', component: CadastroTurma },
      { path: 'classes/edit/:id', component: CadastroTurma },
      // Reservas de Ambientes
      { path: 'reservas-salas', component: ReservasSalas },
      // Ambientes
      { path: 'ambientes', component: ConsultaAmbiente },
      { path: 'ambientes/new', component: CadastroAmbiente },
      { path: 'ambientes/edit/:id', component: CadastroAmbiente },
      { path: 'calendar', component: ConsultaCalendario },
      // Avisos
      {
        path: 'avisos',
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
        loadComponent: () =>
          import('./pages/admin/user-management/user-management').then((m) => m.UserManagement),
      },
      {
        path: 'school-settings',
        loadComponent: () =>
          import('./pages/admin/school-settings/school-settings').then((m) => m.SchoolSettings),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/admin/user-profile/user-profile').then((m) => m.UserProfile),
      },
      {
        path: 'licensing',
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
