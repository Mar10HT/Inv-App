// Hooks declared outside any describe run around every spec in the suite.
//
// AuthService reads the stored user when it is created and ThemeService writes the theme, so a
// spec that leaves either behind changes how the next one starts.

beforeEach(() => {
  localStorage.clear();
  sessionStorage.clear();
});

afterEach(() => {
  document.documentElement.removeAttribute('data-theme');
});
