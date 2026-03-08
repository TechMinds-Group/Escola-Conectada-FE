import { Injectable, signal, computed } from '@angular/core';

export type Language = 'PT-BR' | 'ES';

interface TranslationDictionary {
  [key: string]: {
    'PT-BR': string;
    ES: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class LanguageService {
  private readonly LANG_KEY = 'user-lang';
  currentLang = signal<Language>(this.loadLang());

  private dictionary: TranslationDictionary = {
    REGISTRATIONS: { 'PT-BR': 'Registros', ES: 'Registros' },
    TEACHERS: { 'PT-BR': 'Professores', ES: 'Profesores' },
    TIMETABLE: { 'PT-BR': 'Horários', ES: 'Horarios' },
    DASHBOARD: { 'PT-BR': 'Painel', ES: 'Panel' },
    SETTINGS: { 'PT-BR': 'Administrativo', ES: 'Administrativo' },
    NEW_TEACHER: { 'PT-BR': 'Novo Professor', ES: 'Nuevo Profesor' },
    SAVE: { 'PT-BR': 'Salvar', ES: 'Guardar' },
    CANCEL: { 'PT-BR': 'Cancelar', ES: 'Cancelar' },
    EDIT_TEACHER: { 'PT-BR': 'Editar Professor', ES: 'Editar Profesor' },
    CONFIRM_EDIT: { 'PT-BR': 'Confirmar Edição', ES: 'Confirmar Edición' },
    CONFIRM_CREATE: { 'PT-BR': 'Confirmar Cadastro', ES: 'Confirmar Registro' },
    DELETE_CONFIRM: {
      'PT-BR': 'Deseja realmente excluir este professor?',
      ES: '¿Está seguro de que desea eliminar a este profesor?',
    },
    NAME: { 'PT-BR': 'Nome Completo', ES: 'Nombre Completo' },
    EMAIL: { 'PT-BR': 'E-mail', ES: 'Correo Electrónico' },
    SUBJECT: { 'PT-BR': 'Disciplina', ES: 'Asignatura' },
    COLOR: { 'PT-BR': 'Identificação Visual', ES: 'Identificación Visual' },
    ACTIONS: { 'PT-BR': 'Ações', ES: 'Acciones' },
    TYPE: { 'PT-BR': 'Tipo', ES: 'Tipo' },
    CAPACITY: { 'PT-BR': 'Capacidade', ES: 'Capacidad' },
    BUILDING: { 'PT-BR': 'Bloco/Prédio', ES: 'Bloque/Edificio' },
    WORKLOAD: { 'PT-BR': 'Carga Horária', ES: 'Carga Horaria' },
    PROCESSING: { 'PT-BR': 'Processando...', ES: 'Procesando...' },
    SAVING: { 'PT-BR': 'Salvando...', ES: 'Guardando...' },
    PHONE: { 'PT-BR': 'Celular', ES: 'Teléfono' },
    WEEKLY: { 'PT-BR': '(Semanal)', ES: '(Semanal)' },
    NAME_REQUIRED: {
      'PT-BR': 'O nome é obrigatório (mín. 3 caracteres).',
      ES: 'El nombre es obligatorio (mín. 3 caracteres).',
    },
    PHONE_REQUIRED: { 'PT-BR': 'Telefone obrigatório.', ES: 'Teléfono obligatorio.' },
    // Messages / Placeholders
    NO_DATA: { 'PT-BR': 'Nenhum dado encontrado.', ES: 'No se encontraron datos.' },
    REQUIRED_FIELD: { 'PT-BR': 'Campo obrigatório.', ES: 'Campo obligatorio.' },
    SELECT_SUBJECT: { 'PT-BR': 'Selecione uma disciplina.', ES: 'Seleccione una asignatura.' },
    SUBJECT_REQUIRED: { 'PT-BR': 'Disciplina obrigatória.', ES: 'Asignatura obligatoria.' },
    SAVE_SUCCESS: { 'PT-BR': 'Salvo com sucesso!', ES: '¡Guardado con éxito!' },
    SELECT_PLACEHOLDER: { 'PT-BR': 'Selecione...', ES: 'Seleccione...' },
    WORKLOAD_AND_SUBJECTS: {
      'PT-BR': 'Disciplinas e Carga Horária (semanal)',
      ES: 'Asignaturas y Carga Horaria (semanal)',
    },
    SCHOOL_MATRIX: { 'PT-BR': 'Matriz Escolar', ES: 'Matriz Escolar' },
    GENERAL_SETTINGS: { 'PT-BR': 'Parâmetros Acadêmicos', ES: 'Parámetros Académicos' },
  };

  constructor() {}

  setLanguage(lang: Language) {
    this.currentLang.set(lang);
    localStorage.setItem(this.LANG_KEY, lang);
  }

  t(key: string): string {
    const translation = this.dictionary[key];
    if (!translation) return key;
    return translation[this.currentLang()];
  }

  // Helper computed for easier usage in templates if needed
  translate = computed(() => (key: string) => this.t(key));

  private loadLang(): Language {
    const saved = localStorage.getItem(this.LANG_KEY) as Language;
    if (saved === 'PT-BR' || saved === 'ES') return saved;
    return 'PT-BR';
  }
}
