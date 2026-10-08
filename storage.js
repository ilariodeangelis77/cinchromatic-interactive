import { Editor, STORAGE_KEY } from './editor.js';

export function loadEditor(source, getStorage) {
  let storage;
  try {
    storage = getStorage();
    const saved = storage.getItem(STORAGE_KEY);
    return { editor: new Editor(source, saved ? JSON.parse(saved) : null), storage, warning: '' };
  } catch {
    return { editor: new Editor(source), storage, warning: 'Could not load a save. Starting fresh.' };
  }
}

export function saveEditor(editor, storage) {
  try {
    if (!storage) throw new Error('Storage unavailable');
    storage.setItem(STORAGE_KEY, JSON.stringify(editor.serialize()));
    return '';
  } catch { return 'Saving unavailable. Edits last until this page closes.'; }
}
