const STORAGE_KEY = 'bol-project-credits';
const fields = ['team', 'course', 'section', 'instructor', 'institution'];

export class Credits {
  values = {};
  edited = false;

  async load() {
    let configured = {};
    try {
      const response = await fetch('assets/project-info.json');
      if (response.ok) configured = await response.json();
    } catch {
      // Credits can still be edited if the project defaults cannot load.
    }

    let saved = {};
    try {
      saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
    } catch {
      // Storage can be unavailable or contain malformed data.
    }

    if (this.edited) return;
    this.values = Object.fromEntries(fields.map(field => [
      field, String(saved?.[field] ?? configured?.[field] ?? '').slice(0, 2000),
    ]));
  }

  save(formData) {
    this.edited = true;
    this.values = Object.fromEntries(fields.map(field => [
      field, String(formData.get(field) ?? '').trim().slice(0, 2000),
    ]));
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.values));
      return true;
    } catch {
      return false;
    }
  }
}
