import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Professor {
  id: string;
  name: string;
  email: string;
  celular: string;
  contractualWorkload: number;
  mainSubjectId: string | null;
  availability: boolean[][]; // [Day][Shift]

  secondarySubjectIds: string[];
  avatar: string;
  allocations: {
    turmaNome: string;
    disciplinaNome: string;
    diaDaSemana: number;
    ordemAula: number;
    cargaHoraria: number;
  }[];
  // Computed properties available for UI usage
  allocatedWorkload?: number;
  // Others as needed
}

interface ProfessorDto {
  Id: string;
  Name: string;
  Email: string;
  Celular: string;
  ContractualWorkload: number;
  AllocatedWorkload: number;
  MainSubjectId: string | null;
  AvailabilityJson: string;
  SecondarySubjectIdsJson: string;
  Allocations: {
    TurmaNome: string;
    DisciplinaNome: string;
    DiaDaSemana: number;
    OrdemAula: number;
    CargaHoraria: number;
  }[];
}

interface CreateProfessorDto {
  Name: string;
  Email: string | null;
  Celular: string;
  ContractualWorkload: number;
  MainSubjectId: string | null;
  AvailabilityJson: string;
  SecondarySubjectIdsJson: string;
}

@Injectable({
  providedIn: 'root',
})
export class ProfessorService {
  private http = inject(HttpClient);
  private apiUrl = `${environment.apiUrl}/professor`;

  getAll(): Observable<Professor[]> {
    return this.http.get<any>(this.apiUrl).pipe(
      map((res) => {
        const dtos = res && res.data ? res.data : res;
        return Array.isArray(dtos) ? dtos.map((dto: any) => this.mapDtoToProfessor(dto)) : [];
      }),
    );
  }

  getById(id: string): Observable<Professor> {
    return this.http.get<any>(`${this.apiUrl}/${id}`).pipe(
      map((res) => {
        // The API returns { success: true, message: "", data: { ... } }
        const dto = res?.data || res;
        return this.mapDtoToProfessor(dto);
      }),
    );
  }

  create(professor: Omit<Professor, 'id'>): Observable<string> {
    const dto = this.mapProfessorToCreateDto(professor);
    return this.http.post<string>(this.apiUrl, dto);
  }

  update(id: string, professor: Omit<Professor, 'id'> | Professor): Observable<string> {
    const dto = this.mapProfessorToDto(professor);
    dto.Id = id;
    return this.http.put<string>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private mapDtoToProfessor(dto: any): Professor {
    return {
      id: dto.id ?? dto.Id,
      name: dto.name ?? dto.Name,
      email: dto.email ?? dto.Email,
      celular: dto.celular ?? dto.Celular,
      contractualWorkload: dto.contractualWorkload ?? dto.ContractualWorkload,
      allocatedWorkload: (dto.allocatedWorkload ?? dto.AllocatedWorkload) || 0,
      mainSubjectId: dto.mainSubjectId ?? dto.MainSubjectId,
      availability:
        (dto.availabilityJson ?? dto.AvailabilityJson)
          ? JSON.parse(dto.availabilityJson ?? dto.AvailabilityJson)
          : [],
      secondarySubjectIds:
        (dto.secondarySubjectIdsJson ?? dto.SecondarySubjectIdsJson)
          ? JSON.parse(dto.secondarySubjectIdsJson ?? dto.SecondarySubjectIdsJson)
          : [],
      avatar: this.generateAvatar(dto.name ?? dto.Name, dto.mainSubjectId ?? dto.MainSubjectId),
      allocations: (dto.allocations ?? dto.Allocations ?? []).map((a: any) => ({
        turmaNome: a.turmaNome ?? a.TurmaNome,
        disciplinaNome: a.disciplinaNome ?? a.DisciplinaNome,
        diaDaSemana: a.diaDaSemana ?? a.DiaDaSemana,
        ordemAula: a.ordemAula ?? a.OrdemAula,
        cargaHoraria: a.cargaHoraria ?? a.CargaHoraria,
      })),
    };
  }

  private generateAvatar(name: string, mainSubjectId: string | null): string {
    // Basic color logic based on ID (mocking the SchoolDataService logic)
    // In a real app, color might come from the Subject entity
    const color = '0d6efd'; // Default blue
    return `https://ui-avatars.com/api/?name=${name}&background=${color}&color=fff`;
  }

  private mapProfessorToDto(professor: Omit<Professor, 'id'> | Professor): any {
    return {
      Id: (professor as Professor).id || '00000000-0000-0000-0000-000000000000',
      Name: professor.name,
      Email: professor.email,
      Celular: professor.celular,
      ContractualWorkload: professor.contractualWorkload,
      MainSubjectId: professor.mainSubjectId,
      AvailabilityJson: JSON.stringify(professor.availability),
      SecondarySubjectIdsJson: JSON.stringify(professor.secondarySubjectIds),
    };
  }

  private mapProfessorToCreateDto(professor: Omit<Professor, 'id'>): CreateProfessorDto {
    return {
      Name: professor.name,
      Email: professor.email || null,
      Celular: professor.celular,
      ContractualWorkload: professor.contractualWorkload,
      MainSubjectId: professor.mainSubjectId,
      AvailabilityJson: JSON.stringify(professor.availability),
      SecondarySubjectIdsJson: JSON.stringify(professor.secondarySubjectIds),
    };
  }

  // Tutorial Persistence (LocalStorage fallback)
  private readonly TUTORIAL_KEY = 'hasCompletedProfessoresTour';

  hasCompletedTutorial(): boolean {
    return localStorage.getItem(this.TUTORIAL_KEY) === 'true';
  }

  completeTutorial(): void {
    localStorage.setItem(this.TUTORIAL_KEY, 'true');
  }

  resetTutorial(): void {
    localStorage.removeItem(this.TUTORIAL_KEY);
  }
}
