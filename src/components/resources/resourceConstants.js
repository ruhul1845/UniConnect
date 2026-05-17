export const RESOURCE_BUCKET = 'resources';

export const RESOURCE_TYPES = [
  { key: 'Slide', label: 'Slides' },
  { key: 'Book', label: 'Books' },
  { key: 'MidTerm', label: 'Mid-Term Papers' },
  { key: 'Final', label: 'Final Papers' },
  { key: 'Lab', label: 'Lab Sheets' },
  { key: 'Project', label: 'Projects' },
];

export const DEFAULT_FILTERS = {
  search: '',
  courseCode: '',
  year: 'All Years',
  batch: 'All Batches',
  semester: 'All Semesters',
};

export const DEFAULT_UPLOAD_FORM = {
  title: '',
  resource_type: 'Slide',
  course_code: '',
  batch: '',
  semester: '',
  year: '',
  author: '',
  edition: '',
  lecture_no: '',
  github_link: '',
  file: null,
};

export const DEFAULT_OPTIONS = {
  semesters: ['1-1', '1-2', '2-1', '2-2', '3-1', '3-2', '4-1', '4-2'],
  batches: ['28', '29', '30', '31'],
  years: ['2024', '2025', '2026'],
};
