'use strict';

import 'bootstrap/dist/js/bootstrap.min.js';
import 'bootstrap/dist/css/bootstrap.min.css';
document.addEventListener('submit', async (e) => {
  const form = e.target;

  if (
    form.id !== 'delete-schedule-form' &&
    form.id !== 'delete-recipe-form'
  ) {
    return;
  }

  e.preventDefault();

  if (!confirm('本当に削除しますか？')) {
    return;
  }

  try {
    const response = await fetch(form.action, {
      method: form.method || 'POST',
      body: new FormData(form),
    });

    if (!response.ok) {
      throw new Error(`削除に失敗しました: ${response.status}`);
    }

    window.location.href = '/recipes';

  } catch (error) {
    console.error(error);
    alert('削除に失敗しました');
  }
});