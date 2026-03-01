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
  id: string;
  name: string;
  email: string;
  celular: string;
  contractualWorkload: number;
  allocatedWorkload: number;
  mainSubjectId: string | null;
  availabilityJson: string;
  secondarySubjectIdsJson: string;
  allocations: {
    turmaNome: string;
    disciplinaNome: string;
    diaDaSemana: number;
    ordemAula: number;
    cargaHoraria: number;
  }[];
}

interface CreateProfessorDto {
  name: string;
  email: string;
  celular: string;
  contractualWorkload: number;
  mainSubjectId: string | null;
  availabilityJson: string;
  secondarySubjectIdsJson: string;
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

  update(id: string, professor: Omit<Professor, 'id'>): Observable<string> {
    const dto = this.mapProfessorToDto(professor);
    dto.id = id;
    return this.http.put<string>(`${this.apiUrl}/${id}`, dto);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }

  private mapDtoToProfessor(dto: ProfessorDto): Professor {
    const professor: Professor = {
      id: dto.id,
      name: dto.name,
      email: dto.email,
      celular: dto.celular,
      contractualWorkload: dto.contractualWorkload,
      allocatedWorkload: dto.allocatedWorkload || 0,
      mainSubjectId: dto.mainSubjectId,
      availability: dto.availabilityJson ? JSON.parse(dto.availabilityJson) : [],
      secondarySubjectIds: dto.secondarySubjectIdsJson
        ? JSON.parse(dto.secondarySubjectIdsJson)
        : [],
      avatar: this.generateAvatar(dto.name, dto.mainSubjectId),
      allocations: dto.allocations || [],
    };
    console.log('[PROFESSOR-SERVICE] Mapped Professor:', professor);
    return professor;
  }

  private generateAvatar(name: string, mainSubjectId: string | null): string {
    // Basic color logic based on ID (mocking the SchoolDataService logic)
    // In a real app, color might come from the Subject entity
    const color = '0d6efd'; // Default blue
    return `https://ui-avatars.com/api/?name=${name}&background=${color}&color=fff`;
  }

  private mapProfessorToDto(professor: Omit<Professor, 'id'> | Professor): ProfessorDto {
    return {
      id: (professor as Professor).id || '00000000-0000-0000-0000-000000000000',
      name: professor.name,
      email: professor.email,
      celular: professor.celular,
      contractualWorkload: professor.contractualWorkload,
      allocatedWorkload: professor.allocatedWorkload || 0,
      mainSubjectId: professor.mainSubjectId,
      availabilityJson: JSON.stringify(professor.availability),
      secondarySubjectIdsJson: JSON.stringify(professor.secondarySubjectIds),
      allocations: (professor as Professor).allocations || [],
    };
  }

  private mapProfessorToCreateDto(professor: Omit<Professor, 'id'>): CreateProfessorDto {
    return {
      name: professor.name,
      email: professor.email,
      celular: professor.celular,
      contractualWorkload: professor.contractualWorkload,
      mainSubjectId: professor.mainSubjectId,
      availabilityJson: JSON.stringify(professor.availability),
      secondarySubjectIdsJson: JSON.stringify(professor.secondarySubjectIds),
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
