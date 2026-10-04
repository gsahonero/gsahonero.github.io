const inputs = [
  '\\title{{{basics.title}}}',
  '\\address{{{basics.location}}}',
  '\\email{{{basics.email}}}',
  '\\homepage{{{basics.homepage}}}',
  '\\definecolor{color1}{HTML}{{{theme.accentColor}}}',
  '\\section{{{labels.basics.research_interests}}}',
  '\\photo[70pt][0.4pt]{{{photo_filename}}}',
  '\\cventry{{{date_paren}}}{{{degree}}}{{{institution}}}{}{}{{{description}}}',
  '\\cvitem{{{group}}}{{{items_csv}}}',
  '{{{basics.research_interests}}}',
  'color: #{{{theme.accentColor}}};',
  '<p>{{{htmlContent}}}</p>'
];

const re = /(\\[a-zA-Z@*]+(?:\[[^\]]*\])*|\}|[a-zA-Z0-9_])\{(\{\{[a-zA-Z0-9_.-]+\}\})\}/g;

inputs.forEach(s => {
  let prev;
  let res = s;
  do {
    prev = res;
    res = res.replace(re, '$1{ $2 }');
  } while (res !== prev);
  console.log(s, '===>', res);
});
