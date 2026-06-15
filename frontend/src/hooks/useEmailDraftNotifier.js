export const notifyEmailDraft = (count = 1) => {
  window.dispatchEvent(new CustomEvent('emailDrafted', { detail: { count } }));
};