import themeConfig from '../config/themeConfig.json';

type ThemeType = keyof typeof themeConfig.themes;

export const themeService = {
  setTheme: function(theme: ThemeType) {
    const themeColors = themeConfig.themes[theme];
    
    localStorage.setItem('userTheme', theme);
    
    if (theme === 'light') {
      document.body.classList.add('light-theme');
      document.body.classList.remove('dark-theme');
    } else {
      document.body.classList.add('dark-theme');
      document.body.classList.remove('light-theme');
    }

    document.documentElement.style.setProperty('--theme-background', themeColors.backgroundColor);
    document.documentElement.style.setProperty('--theme-text', themeColors.textColor);
    document.documentElement.style.setProperty('--theme-border', themeColors.themeBorder);
  },

  resetToDefault: function() {
    const savedTheme = localStorage.getItem('userTheme') as ThemeType;
    
    if (savedTheme && savedTheme in themeConfig.themes) {
      this.setTheme(savedTheme);
    } else {
      const defaultTheme: ThemeType = 'dark';
      const defaultColors = themeConfig.themes[defaultTheme];
      
      localStorage.setItem('userTheme', defaultTheme);
      document.body.classList.remove('light-theme');
      document.body.classList.add('dark-theme');
      
      document.documentElement.style.setProperty('--theme-background', defaultColors.backgroundColor);
      document.documentElement.style.setProperty('--theme-text', defaultColors.textColor);
      document.documentElement.style.setProperty('--theme-border', defaultColors.themeBorder);
    }
  },

  getCurrentTheme: function(): ThemeType {
    const savedTheme = localStorage.getItem('userTheme') as ThemeType;
    if (savedTheme && savedTheme in themeConfig.themes) {
      return savedTheme;
    }
    return 'dark';
  }
};

export default themeService;
