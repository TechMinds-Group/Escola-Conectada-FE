import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { firstValueFrom } from 'rxjs';

export enum EducationLevel {
  Graduacao = 'Graduação',
  Medio = 'Médio',
  Tecnico = 'Técnico',
  Fundamental = 'Fundamental',
  Infantil = 'Infantil',
  EJA = 'EJA',
  Especializacao = 'Especialização',
}

export enum ThematicAxis {
  Exatas = 'Exatas',
  Humanas = 'Humanas',
  Biologicas = 'Biológicas',
  Linguagens = 'Linguagens',
  Artes = 'Artes',
  Tecnologia = 'Tecnologia',
  Outros = 'Outros',
}

export interface Subject {
  id: string;
  name: string;
  code?: string;
  level?: EducationLevel;
  axis: ThematicAxis;
  color: string; // Hex code
  category: 'Base Comum' | 'Técnica' | 'Eletiva';
  preferredEnvironmentId?: string;
  workload?: number;
}

export interface TeacherAllocation {
  subjectId: string;
  workload: number;
}

export interface Teacher {
  id: string;
  name: string;
  allocations: TeacherAllocation[];
  avatar: string; // URL
  availability: boolean[][]; // [Day][Shift] (0-4 Mon-Fri, 0-2 Morn/Aft/Night)
  email?: string;
  phone?: string;
  cpf?: string;
  // New Fields
  contractualWorkload: number; // Total hours hired
  mainSubjectId: string;
  secondarySubjectIds: string[];
}

export interface MatrixSubject {
  id?: string; // PK of MatrizDisciplina
  subjectId: string; // FK to Materia
  weeklyLessons: number;
  isBaseComum: boolean;
  allowConsecutive: boolean;
  resourceId?: string;
  maxDailyLessons?: number;
}

export interface LevelConfiguration {
  id?: string; // PK of MatrizNivel
  level: EducationLevel;
  lessonDuration: number;
  schoolWeeks: number;
  subjects: MatrixSubject[];
}

// ... (skip unchanged parts)

export interface SchoolMatrix {
  id: string;
  name: string;
  year: number;
  mecAnnualHours: number;
  levels: LevelConfiguration[];
  status: 'Ativa' | 'Rascunho';
}

export interface SchoolClass {
  id: string;
  name: string;
  year: number;
  shift: 'Manhã' | 'Tarde' | 'Noite' | 'Integral';
  matrixId: string;
  roomId?: string;
  maxCapacity: number;
  studentsCount: number;
  scheduleStatus: 'Completo' | 'Incompleto' | 'Conflito';
  assignments: { subjectId: string; teacherId: string | null }[]; // Link Subject -> Teacher
}

export interface SchoolTVSettings {
  sceneDurations: {
    timetable: number; // seconds
    events: number;
    notices: number;
  };
  shiftTriggers: {
    morning: string; // HH:MM
    afternoon: string;
    night: string;
  };
}

export interface SchoolEvent {
  id: number;
  name: string;
  startDate: string; // ISO Date YYYY-MM-DD
  endDate: string; // ISO Date YYYY-MM-DD
  type:
    | 'Feriado Nacional'
    | 'Feriado Local'
    | 'Recesso Escolar'
    | 'Planejamento Pedagógico'
    | 'Evento Festivo';
  isSchoolDay: boolean;
  suspendClasses: boolean;
  scope: 'Todos' | 'Fundamental' | 'Médio';
}

export interface TimeSlot {
  id?: string;
  type: 'Aula' | 'Intervalo';
  index?: number; // 1, 2, 3... (Optional for Break)
  start: string; // HH:MM
  end: string; // HH:MM
}

export interface SchoolTimeGrid {
  id: string;
  name: string;
  shift: 'Manhã' | 'Tarde' | 'Noite' | 'Integral';
  slots: TimeSlot[];
}

export interface SchoolRoomType {
  id: string;
  name: string;
}

export interface SchoolBlock {
  id: string;
  name: string;
}

export interface SchoolResource {
  id: string;
  name: string;
}

export interface AuthenticatedUser {
  name: string;
  email: string;
  avatar: string;
  phone: string;
  role: string;
  completeness: number;
  stats: {
    actionsThisMonth: number;
  };
  security: {
    twoFactorEnabled: boolean;
    lastAccessLocation: string;
  };
  preferences: {
    emailAlerts: boolean;
    weeklyReports: boolean;
    notificationSounds: boolean;
  };
  sessions: {
    id: number;
    device: string;
    icon: string;
    ip: string;
    location: string;
    isCurrent: boolean;
    lastActive: string;
  }[];
}

export interface SchoolRoom {
  id: string;
  name: string;
  type: string; // Now dynamic
  typeId?: string; // Optional link to SchoolRoomType
  capacity: number;
  block: string;
  resources: string[];
}

@Injectable({
  providedIn: 'root',
})
export class SchoolDataService {
  private http = inject(HttpClient);
  private apiUrl = environment.apiUrl;

  // Static/Enum-based Data Signals
  readonly educationLevels = signal<string[]>(Object.values(EducationLevel));
  readonly thematicAxes = signal<string[]>(Object.values(ThematicAxis));

  getContrastText(hexColor: string): string {
    if (!hexColor) return '#000000';
    const hex = hexColor.replace('#', '');
    const r = parseInt(hex.substr(0, 2), 16);
    const g = parseInt(hex.substr(2, 2), 16);
    const b = parseInt(hex.substr(4, 2), 16);
    const yiq = (r * 299 + g * 587 + b * 114) / 1000;
    return yiq >= 128 ? '#000000' : '#ffffff';
  }

  // HTTP Methods
  async loadSubjects() {
    const res = await firstValueFrom(this.http.get<any>(`${this.apiUrl}/Materias`));
    const data = res && res.data ? res.data : res;
    this.subjects.set(Array.isArray(data) ? data.map((item) => this.mapToSubject(item)) : []);
  }

  async addSubject(subject: Omit<Subject, 'id'>) {
    const payload = this.mapToDto(subject);
    const result = await firstValueFrom(this.http.post<any>(`${this.apiUrl}/Materias`, payload));
    await this.loadSubjects();
    return result;
  }

  async updateSubject(id: string, subject: Subject) {
    const payload = this.mapToDto(subject);
    const result = await firstValueFrom(
      this.http.put<any>(`${this.apiUrl}/Materias/${id}`, { ...payload, id }),
    );
    await this.loadSubjects();
    return result;
  }

  async deleteSubject(id: string) {
    const result = await firstValueFrom(this.http.delete<any>(`${this.apiUrl}/Materias/${id}`));
    await this.loadSubjects();
    return result;
  }

  async loadMatrices() {
    const res = await firstValueFrom(this.http.get<any>(`${this.apiUrl}/MatrizesEscolares`));
    const data = res && res.data ? res.data : res;
    this.schoolMatrices.set(
      Array.isArray(data) ? data.map((item) => this.mapToSchoolMatrix(item)) : [],
    );
  }

  async getMatrixById(id: string): Promise<SchoolMatrix> {
    const res = await firstValueFrom(this.http.get<any>(`${this.apiUrl}/MatrizesEscolares/${id}`));
    const item = res && res.data ? res.data : res;
    return this.mapToSchoolMatrix(item);
  }

  async addMatrix(matrix: Omit<SchoolMatrix, 'id'>) {
    const payload = this.mapToMatrixDto(matrix);
    const result = await firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/MatrizesEscolares`, payload),
    );
    await this.loadMatrices();
    return result;
  }

  // Data Signals
  readonly subjects = signal<Subject[]>([]);
  readonly schoolMatrices = signal<SchoolMatrix[]>([]);
  readonly schoolClasses = signal<SchoolClass[]>([]);
  readonly roomTypes = signal<SchoolRoomType[]>([]);
  readonly schoolBlocks = signal<SchoolBlock[]>([]);
  readonly schoolResources = signal<SchoolResource[]>([]);
  readonly schoolRooms = signal<SchoolRoom[]>([]);
  readonly academicParameters = signal({ lessonDuration: 50, schoolWeeks: 40 });
  readonly schoolEvents = signal<SchoolEvent[]>([]);
  readonly schoolTimeGrids = signal<SchoolTimeGrid[]>([]);
  readonly schoolUsers = signal<any[]>([
    { name: 'Michel Bittencourt', email: 'michel@escola.com.br', role: 'Administrador' },
    { name: 'Ana Silva', email: 'ana.secretaria@escola.com.br', role: 'Secretaria' },
    { name: 'Carlos Santos', email: 'carlos.coord@escola.com.br', role: 'Coordenador' },
  ]);
  readonly schoolInfo = signal({
    name: 'Escola Conectada Elite',
    slogan: 'Tecnologia a serviço da educação',
    cnpj: '00.000.000/0001-00',
    email: 'contato@escolaelite.com.br',
    phone: '(11) 5555-4444',
  });

  // Teachers Mock Data (Will be unmocked later)
  readonly teachers = signal<Teacher[]>([
    {
      id: '1',
      name: 'Dr. Ricardo Oliveira',
      allocations: [{ subjectId: '1', workload: 40 }],
      avatar: 'https://ui-avatars.com/api/?name=Ricardo+Oliveira&background=0d6efd&color=fff',
      availability: this.generateMockAvailability(),
      email: 'ricardo@escola.com',
      phone: '(11) 99999-9999',
      cpf: '111.111.111-11',
      contractualWorkload: 40,
      mainSubjectId: '1',
      secondarySubjectIds: ['3'],
    },
    {
      id: '2',
      name: 'Profa. Amanda Costa',
      allocations: [{ subjectId: '2', workload: 32 }],
      avatar: 'https://ui-avatars.com/api/?name=Amanda+Costa&background=d63384&color=fff',
      availability: this.generateMockAvailability(),
      email: 'amanda@escola.com',
      phone: '(11) 88888-8888',
      cpf: '222.222.222-22',
      contractualWorkload: 32,
      mainSubjectId: '2',
      secondarySubjectIds: ['5', '7'],
    },
    {
      id: '3',
      name: 'Dr. Marcos Santos',
      allocations: [{ subjectId: '3', workload: 40 }],
      avatar: 'https://ui-avatars.com/api/?name=Marcos+Santos&background=6610f2&color=fff',
      availability: this.generateMockAvailability(),
      email: 'marcos@escola.com',
      phone: '(11) 77777-7777',
      cpf: '333.333.333-33',
      contractualWorkload: 40,
      mainSubjectId: '3',
      secondarySubjectIds: ['1'],
    },
  ]);

  // Helpers
  private generateMockAvailability(): boolean[][] {
    const grid: boolean[][] = [];
    for (let day = 0; day < 5; day++) {
      const dailySlots: boolean[] = [];
      for (let slot = 0; slot < 3; slot++) {
        dailySlots.push(Math.random() > 0.3);
      }
      grid.push(dailySlots);
    }
    return grid;
  }

  checkRoomConflict(
    roomId: string,
    shift: string,
    currentClassId: string | null,
  ): SchoolClass | null {
    return (
      this.schoolClasses().find(
        (c) => c.roomId === roomId && c.shift === shift && c.id !== currentClassId,
      ) || null
    );
  }

  getTeacherCoverage(classId: string): { assigned: number; total: number; missing: number } {
    const cls = this.schoolClasses().find((c) => c.id === classId);
    if (!cls) return { assigned: 0, total: 0, missing: 0 };

    const matrix = this.schoolMatrices().find((m) => m.id === cls.matrixId);
    if (!matrix) return { assigned: 0, total: 0, missing: 0 };

    const totalSubjects = matrix.levels.reduce((acc, l) => acc + l.subjects.length, 0);
    const assignedCount = cls.assignments
      ? cls.assignments.filter((a) => a.teacherId !== null).length
      : 0;

    return {
      assigned: assignedCount,
      total: totalSubjects,
      missing: totalSubjects - assignedCount,
    };
  }

  // Teacher Methods
  addTeacher(teacher: Omit<Teacher, 'id' | 'avatar'>) {
    const newId = (Math.max(0, ...this.teachers().map((t) => parseInt(t.id))) + 1).toString();
    const firstAllocation = teacher.allocations[0];
    const subject = firstAllocation
      ? this.subjects().find((s) => s.id === firstAllocation.subjectId)
      : null;
    const color = subject ? subject.color.replace('#', '') : '000000';

    const newTeacher: Teacher = {
      ...teacher,
      id: newId,
      avatar: `https://ui-avatars.com/api/?name=${teacher.name}&background=${color}&color=fff`,
    };
    this.teachers.update((teachers) => [...teachers, newTeacher]);
  }

  updateTeacher(id: string, teacherData: Partial<Omit<Teacher, 'id' | 'avatar' | 'availability'>>) {
    this.teachers.update((teachers) =>
      teachers.map((t) => {
        if (t.id === id) {
          let newAvatar = t.avatar;
          if (teacherData.name || teacherData.allocations) {
            const allocations = teacherData.allocations || t.allocations;
            const name = teacherData.name || t.name;
            const firstAllocation = allocations[0];
            const subject = firstAllocation
              ? this.subjects().find((s) => s.id === firstAllocation.subjectId)
              : null;
            const color = subject ? subject.color.replace('#', '') : '000000';
            newAvatar = `https://ui-avatars.com/api/?name=${name}&background=${color}&color=fff`;
          }
          return { ...t, ...teacherData, avatar: newAvatar };
        }
        return t;
      }),
    );
  }

  deleteTeacher(id: string) {
    this.teachers.update((teachers) => teachers.filter((t) => t.id !== id));
  }

  // Matrix Methods
  async updateMatrix(id: string, matrixData: Partial<SchoolMatrix>) {
    const dto = this.mapToMatrixDto({ ...matrixData, id });

    console.log('[SchoolData] PUT Payload:', dto);

    const result = await firstValueFrom(
      this.http.put<any>(`${this.apiUrl}/MatrizesEscolares/${id}`, dto),
    );
    await this.loadMatrices();
    return result;
  }

  async deleteMatrix(id: string) {
    await firstValueFrom(this.http.delete<any>(`${this.apiUrl}/MatrizesEscolares/${id}`));
    await this.loadMatrices();
  }

  // Class Methods
  addClass(classData: Omit<SchoolClass, 'id'>) {
    const newId = (
      Math.max(1000, ...this.schoolClasses().map((c) => parseInt(c.id))) + 1
    ).toString();
    this.schoolClasses.update((classes) => [...classes, { ...classData, id: newId }]);
  }

  updateClass(id: string, classData: Partial<SchoolClass>) {
    this.schoolClasses.update((classes) =>
      classes.map((c) => (c.id === id ? { ...c, ...classData } : c)),
    );
  }

  deleteClass(id: string) {
    this.schoolClasses.update((classes) => classes.filter((c) => c.id !== id));
  }

  // Room Type Methods
  addRoomType(name: string) {
    const newId = (Math.max(0, ...this.roomTypes().map((t) => parseInt(t.id))) + 1).toString();
    this.roomTypes.update((types) => [...types, { id: newId, name }]);
    return newId;
  }

  updateRoomType(id: string, name: string) {
    this.roomTypes.update((types) => types.map((t) => (t.id === id ? { ...t, name } : t)));
  }

  deleteRoomType(id: string) {
    this.roomTypes.update((types) => types.filter((t) => t.id !== id));
  }

  // Block Methods
  addBlock(name: string) {
    const newId = (Math.max(0, ...this.schoolBlocks().map((b) => parseInt(b.id))) + 1).toString();
    this.schoolBlocks.update((blocks) => [...blocks, { id: newId, name }]);
    return newId;
  }

  updateBlock(id: string, name: string) {
    this.schoolBlocks.update((blocks) => blocks.map((b) => (b.id === id ? { ...b, name } : b)));
  }

  deleteBlock(id: string) {
    this.schoolBlocks.update((blocks) => blocks.filter((b) => b.id !== id));
  }

  // Resource Methods
  addResource(name: string) {
    const newId = (
      Math.max(0, ...this.schoolResources().map((r) => parseInt(r.id))) + 1
    ).toString();
    this.schoolResources.update((resources) => [...resources, { id: newId, name }]);
    return newId;
  }

  updateResource(id: string, name: string) {
    this.schoolResources.update((resources) =>
      resources.map((r) => (r.id === id ? { ...r, name } : r)),
    );
  }

  deleteResource(id: string) {
    this.schoolResources.update((resources) => resources.filter((r) => r.id !== id));
  }

  // Room Methods
  addRoom(room: Omit<SchoolRoom, 'id'>) {
    const newId = (Math.max(0, ...this.schoolRooms().map((r) => parseInt(r.id))) + 1).toString();
    this.schoolRooms.update((rooms) => [...rooms, { ...room, id: newId }]);
  }

  updateRoom(id: string, roomData: Partial<SchoolRoom>) {
    this.schoolRooms.update((rooms) => rooms.map((r) => (r.id === id ? { ...r, ...roomData } : r)));
  }

  deleteRoom(id: string) {
    this.schoolRooms.update((rooms) => rooms.filter((r) => r.id !== id));
  }

  // Academic Parameters
  updateAcademicParameters(params: Partial<{ lessonDuration: number; schoolWeeks: number }>) {
    this.academicParameters.update((curr) => ({ ...curr, ...params }));
  }

  // TV Settings
  updateTVSettings(settings: SchoolTVSettings) {
    this.tvSettings.set(settings);
    localStorage.setItem('school_tv_settings', JSON.stringify(settings));
  }

  // User Management
  addUser(user: any) {
    this.schoolUsers.update((users) => [...users, user]);
  }

  // School Settings
  updateSchoolInfo(info: any) {
    this.schoolInfo.update((curr) => ({ ...curr, ...info }));
  }

  // Events
  addEvent(event: Omit<SchoolEvent, 'id'>) {
    const newId = Math.max(0, ...this.schoolEvents().map((e) => e.id)) + 1;
    this.schoolEvents.update((events) => [...events, { ...event, id: newId }]);
  }

  updateEvent(id: number, eventData: Partial<SchoolEvent>) {
    this.schoolEvents.update((events) =>
      events.map((e) => (e.id === id ? { ...e, ...eventData } : e)),
    );
  }

  deleteEvent(id: number) {
    this.schoolEvents.update((events) => events.filter((e) => e.id !== id));
  }

  async loadTimeGrids() {
    const res = await firstValueFrom(this.http.get<any>(`${this.apiUrl}/GradesHoraria`));
    const data = res && res.data ? res.data : res;
    this.schoolTimeGrids.set(
      Array.isArray(data) ? data.map((item) => this.mapToSchoolTimeGrid(item)) : [],
    );
  }

  async addTimeGrid(grid: Omit<SchoolTimeGrid, 'id'>) {
    const payload = this.mapToTimeGridDto(grid);
    const result = await firstValueFrom(
      this.http.post<any>(`${this.apiUrl}/GradesHoraria`, payload),
    );
    await this.loadTimeGrids();
    return result;
  }

  async updateTimeGrid(id: string, gridData: Partial<SchoolTimeGrid>) {
    const payload = this.mapToTimeGridDto(gridData);
    const result = await firstValueFrom(
      this.http.put<any>(`${this.apiUrl}/GradesHoraria/${id}`, { ...payload, Id: id }),
    );
    await this.loadTimeGrids();
    return result;
  }

  async deleteTimeGrid(id: string) {
    const result = await firstValueFrom(
      this.http.delete<any>(`${this.apiUrl}/GradesHoraria/${id}`),
    );
    await this.loadTimeGrids();
    return result;
  }

  private mapToTimeGridDto(grid: Partial<SchoolTimeGrid>): any {
    const shiftMap: Record<string, number> = {
      Manhã: 1,
      Tarde: 2,
      Noite: 3,
      Integral: 4,
    };

    return {
      Nome: grid.name,
      Turno: shiftMap[grid.shift || 'Manhã'],
      Ativo: true,
      Itens:
        grid.slots?.map((s) => ({
          Id: s.id || '00000000-0000-0000-0000-000000000000',
          OrdemAula: s.index || 0,
          HoraInicio: this.formatToApiTime(s.start),
          HoraFim: this.formatToApiTime(s.end),
          IsIntervalo: s.type === 'Intervalo',
        })) || [],
    };
  }

  private mapToSchoolTimeGrid(item: any): SchoolTimeGrid {
    const shiftReverseMap: Record<number, string> = {
      1: 'Manhã',
      2: 'Tarde',
      3: 'Noite',
      4: 'Integral',
    };

    return {
      id: String(item.id ?? item.Id ?? ''),
      name: item.nome ?? item.Nome ?? '',
      shift: shiftReverseMap[item.turno ?? item.Turno] as any,
      slots: (item.itens ?? item.Itens ?? []).map((i: any) => ({
        id: i.id ?? i.Id,
        type: (i.isIntervalo ?? i.IsIntervalo) ? 'Intervalo' : ('Aula' as any),
        index: i.ordemAula ?? i.OrdemAula,
        start: this.formatFromApiTime(i.horaInicio ?? i.HoraInicio),
        end: this.formatFromApiTime(i.horaFim ?? i.HoraFim),
      })),
    };
  }

  readonly tvSettings = signal<SchoolTVSettings>(this.loadSettings());
  readonly currentUser = signal<AuthenticatedUser>({
    name: 'Usuário',
    email: 'admin@escola.com.br',
    avatar: 'https://ui-avatars.com/api/?name=Usuário&background=0D8ABC&color=fff',
    phone: '(11) 98888-7777',
    role: 'Administrador',
    completeness: 85,
    stats: {
      actionsThisMonth: 124,
    },
    security: {
      twoFactorEnabled: true,
      lastAccessLocation: 'São Paulo, Brasil',
    },
    preferences: {
      emailAlerts: true,
      weeklyReports: false,
      notificationSounds: true,
    },
    sessions: [
      {
        id: 1,
        device: 'Chrome / Windows',
        icon: 'bi-laptop',
        ip: '192.168.1.1',
        location: 'São Paulo, BR',
        isCurrent: true,
        lastActive: 'Agora',
      },
      {
        id: 2,
        device: 'Safari / iPhone',
        icon: 'bi-phone',
        ip: '192.168.1.45',
        location: 'Curitiba, BR',
        isCurrent: false,
        lastActive: '2h atrás',
      },
    ],
  });

  constructor() {
    // Initial data load
    this.loadSubjects();
    this.loadMatrices();

    window.addEventListener('storage', (event) => {
      if (event.key === 'school_tv_settings' && event.newValue) {
        this.tvSettings.set(JSON.parse(event.newValue));
      }
    });

    this.generateMockData();
  }

  private generateMockData() {
    const classes: SchoolClass[] = [];
    const shifts = ['Manhã', 'Tarde', 'Noite'] as const;
    let idCounter = 1000;

    shifts.forEach((shift) => {
      for (let i = 1; i <= 10; i++) {
        classes.push({
          id: (idCounter++).toString(),
          name: `${i}º Ano ${String.fromCharCode(65 + Math.floor(i / 10))} - ${shift}`,
          year: 2026,
          shift: shift,
          matrixId: '1',
          roomId: (100 + (i % 20)).toString(),
          maxCapacity: 40,
          studentsCount: 30 + Math.floor(Math.random() * 10),
          scheduleStatus: 'Incompleto',
          assignments: [],
        });
      }
    });
    this.schoolClasses.set(classes);
  }

  private loadSettings(): SchoolTVSettings {
    const stored = localStorage.getItem('school_tv_settings');
    return stored
      ? JSON.parse(stored)
      : {
          sceneDurations: { timetable: 45, events: 15, notices: 20 },
          shiftTriggers: { morning: '06:00', afternoon: '12:00', night: '18:00' },
        };
  }

  private mapToSubject(item: any): Subject {
    return {
      id: String(item.id ?? item.Id ?? ''),
      name: item.nome ?? item.Nome ?? '',
      color: item.cor ?? item.Cor ?? '#000000',
      category: (item.categoria ?? item.Categoria) as any,
      code: undefined,
      axis:
        (item.codigo ?? item.Codigo ?? '') === ''
          ? ThematicAxis.Outros
          : ((item.codigo ?? item.Codigo) as ThematicAxis),
      workload: item.cargaHoraria ?? item.CargaHoraria ?? 0,
    };
  }

  private mapToDto(subject: Partial<Subject>): any {
    return {
      Nome: subject.name,
      Cor: subject.color,
      Categoria: subject.category,
      Codigo: subject.axis, // Map Axis -> Codigo
      CargaHoraria: subject.workload,
    };
  }

  private mapToMatrixDto(matrix: Partial<SchoolMatrix>): any {
    return {
      Id: matrix.id,
      Nome: matrix.name,
      Ano: matrix.year,
      HorasAnuaisMec: matrix.mecAnnualHours,
      Status: matrix.status,
      Niveis:
        matrix.levels?.map((l) => ({
          Id: l.id,
          Nivel: l.level,
          DuracaoAula: l.lessonDuration,
          SemanasLetivas: l.schoolWeeks,
          Disciplinas: l.subjects.map((s) => ({
            Id: s.id || null,
            MateriaId: s.subjectId || null,
            AulasSemanais: s.weeklyLessons,
            IsBaseComum: s.isBaseComum,
            PermitirConsecutivas: s.allowConsecutive,
            SalaTipoId: s.resourceId || null,
          })),
        })) || [],
    };
  }

  private mapToSchoolMatrix(item: any): SchoolMatrix {
    if (!item) return {} as SchoolMatrix;

    // Backend returns PascalCase. We map to camelCase.
    // Use nullish coalescing to avoid issues with falsy values like 0 (though less likely here)
    return {
      id: String(item.id ?? item.Id ?? ''),
      name: item.nome ?? item.Nome ?? '',
      year: item.ano ?? item.Ano ?? new Date().getFullYear(),
      mecAnnualHours: item.horasAnuaisMec ?? item.HorasAnuaisMec ?? 1200,
      status: item.status ?? item.Status ?? 'Ativa',
      levels: (item.niveis ?? item.Niveis ?? []).map((l: any) => ({
        id: String(l.id ?? l.Id ?? ''),
        level: l.nivel ?? l.Nivel ?? EducationLevel.Fundamental,
        lessonDuration: l.duracaoAula ?? l.DuracaoAula ?? 50,
        schoolWeeks: l.semanasLetivas ?? l.SemanasLetivas ?? 40,
        subjects: (l.disciplinas ?? l.Disciplinas ?? []).map((s: any) => ({
          id: String(s.id ?? s.Id ?? ''),
          subjectId: String(s.materiaId ?? s.MateriaId ?? ''),
          weeklyLessons: s.aulasSemanais ?? s.AulasSemanais ?? 1,
          isBaseComum: s.isBaseComum ?? s.IsBaseComum ?? true,
          allowConsecutive: s.permitirConsecutivas ?? s.PermitirConsecutivas ?? true,
          resourceId: String(s.salaTipoId ?? s.SalaTipoId ?? ''),
          maxDailyLessons: s.maxDailyLessons ?? s.MaxDailyLessons,
        })),
      })),
    };
  }

  private formatToApiTime(time: string): string {
    if (!time) return '00:00:00';
    const parts = time.split(':');
    const hh = parts[0].padStart(2, '0');
    const mm = (parts[1] || '00').padStart(2, '0');
    return `${hh}:${mm}:00`;
  }

  private formatFromApiTime(time: string): string {
    if (!time || typeof time !== 'string') return '00:00';
    const parts = time.split(':');
    const hh = parts[0].padStart(2, '0');
    const mm = (parts[1] || '00').padStart(2, '0');
    return `${hh}:${mm}`;
  }
}
