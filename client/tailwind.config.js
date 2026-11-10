// one palette, nothing else: teal + its tints
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#2b6777',   // deep teal: header, buttons, text
        mist: '#c8d8e4',  // pale blue: panels, taken seats
        paper: '#f2f2f2', // page background
        leaf: '#52ab98',  // accent: route lines, available seats, success
      },
      fontFamily: {
        head: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['"Public Sans"', 'system-ui', 'sans-serif'],
      },
    },
  },
};
