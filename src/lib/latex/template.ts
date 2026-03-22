import type {
  GeneratedResumeData,
  ResumeExperience,
  ResumeEducation,
  ResumeProject,
} from "@/lib/ai/resume-generator";

// ─── LaTeX escaping ───────────────────────────────────────────────────────────

/**
 * Escape special LaTeX characters so user text doesn't break compilation.
 */
function esc(text: string): string {
  return text
    .replace(/\\/g, "\\textbackslash{}")
    .replace(/&/g, "\\&")
    .replace(/%/g, "\\%")
    .replace(/\$/g, "\\$")
    .replace(/#/g, "\\#")
    .replace(/_/g, "\\_")
    .replace(/\{/g, "\\{")
    .replace(/\}/g, "\\}")
    .replace(/~/g, "\\textasciitilde{}")
    .replace(/\^/g, "\\textasciicircum{}")
    .replace(/</g, "\\textless{}")
    .replace(/>/g, "\\textgreater{}");
}

// ─── Section builders ─────────────────────────────────────────────────────────

function buildHeader(data: GeneratedResumeData): string {
  const { contact } = data;
  const name = esc(contact.name || "Your Name");

  const links: string[] = [];
  if (contact.phone) links.push(esc(contact.phone));
  if (contact.email) links.push(`\\href{mailto:${esc(contact.email)}}{${esc(contact.email)}}`);
  if (contact.linkedin) links.push(`\\href{https://${esc(contact.linkedin)}}{${esc(contact.linkedin)}}`);
  if (contact.github) links.push(`\\href{https://${esc(contact.github)}}{${esc(contact.github)}}`);
  if (contact.location) links.push(esc(contact.location));

  return `\\begin{center}
  {\\Huge \\scshape ${name}} \\\\[4pt]
  \\small ${links.join(" $|$ ")}
\\end{center}`;
}

function buildSummary(summary: string): string {
  if (!summary) return "";
  return `\\section{Summary}
${esc(summary)}
\\vspace{2pt}`;
}

function buildSkills(data: GeneratedResumeData): string {
  const { skills } = data;
  const rows: string[] = [];

  if (skills.languages.length)
    rows.push(`\\textbf{Languages} & ${esc(skills.languages.join(", "))} \\\\`);
  if (skills.frameworks.length)
    rows.push(`\\textbf{Frameworks} & ${esc(skills.frameworks.join(", "))} \\\\`);
  if (skills.tools.length)
    rows.push(`\\textbf{Tools \\& Platforms} & ${esc(skills.tools.join(", "))} \\\\`);
  if (skills.databases.length)
    rows.push(`\\textbf{Databases} & ${esc(skills.databases.join(", "))} \\\\`);
  if (skills.other.length)
    rows.push(`\\textbf{Other} & ${esc(skills.other.join(", "))} \\\\`);

  if (!rows.length) return "";

  return `\\section{Technical Skills}
\\begin{tabular*}{\\textwidth}{l@{\\extracolsep{\\fill}}l}
${rows.join("\n")}
\\end{tabular*}`;
}

function buildExperience(experience: ResumeExperience[]): string {
  if (!experience.length) return "";

  const items = experience.map((exp) => {
    const bullets = exp.bullets
      .filter(Boolean)
      .map((b) => `      \\resumeItem{${esc(b)}}`)
      .join("\n");

    return `    \\resumeSubheading
      {${esc(exp.company)}}{${esc(exp.startDate)} -- ${esc(exp.endDate)}}
      {${esc(exp.title)}}{${esc(exp.location)}}
      \\resumeItemListStart
${bullets}
      \\resumeItemListEnd`;
  });

  return `\\section{Experience}
  \\resumeSubHeadingListStart
${items.join("\n\n")}
  \\resumeSubHeadingListEnd`;
}

function buildEducation(education: ResumeEducation[]): string {
  if (!education.length) return "";

  const items = education.map((edu) => {
    const degree = [edu.degree, edu.field].filter(Boolean).join(" in ");
    const gpaLine = edu.gpa ? ` \\textit{GPA: ${esc(edu.gpa)}}` : "";
    const highlights = edu.highlights.filter(Boolean);
    const highlightStr = highlights.length
      ? `\n      \\resumeItemListStart\n${highlights.map((h) => `        \\resumeItem{${esc(h)}}`).join("\n")}\n      \\resumeItemListEnd`
      : "";

    return `    \\resumeSubheading
      {${esc(edu.school)}}{${esc(edu.startDate)} -- ${esc(edu.endDate)}}
      {${esc(degree)}${gpaLine}}{}${highlightStr}`;
  });

  return `\\section{Education}
  \\resumeSubHeadingListStart
${items.join("\n\n")}
  \\resumeSubHeadingListEnd`;
}

function buildProjects(projects: ResumeProject[]): string {
  if (!projects.length) return "";

  const items = projects.map((proj) => {
    const heading = proj.link
      ? `\\textbf{${esc(proj.name)}} $|$ \\emph{\\small ${esc(proj.tech)}} \\hfill \\href{https://${esc(proj.link)}}{\\small ${esc(proj.link)}}`
      : `\\textbf{${esc(proj.name)}} $|$ \\emph{\\small ${esc(proj.tech)}}`;

    const bullets = proj.bullets
      .filter(Boolean)
      .map((b) => `      \\resumeItem{${esc(b)}}`)
      .join("\n");

    return `    \\resumeProjectHeading
      {${heading}}{}
      \\resumeItemListStart
${bullets}
      \\resumeItemListEnd`;
  });

  return `\\section{Projects}
  \\resumeSubHeadingListStart
${items.join("\n\n")}
  \\resumeSubHeadingListEnd`;
}

function buildCertifications(certifications: string[]): string {
  const valid = certifications.filter(Boolean);
  if (!valid.length) return "";

  const items = valid.map((c) => `  \\item \\small{${esc(c)}}`).join("\n");

  return `\\section{Certifications}
\\begin{itemize}[leftmargin=0.15in, label={}]
${items}
\\end{itemize}`;
}

// ─── Full document builder ────────────────────────────────────────────────────

export function buildLatex(data: GeneratedResumeData): string {
  const sections = [
    buildSummary(data.summary),
    buildSkills(data),
    buildExperience(data.experience),
    buildEducation(data.education),
    buildProjects(data.projects),
    buildCertifications(data.certifications),
  ]
    .filter(Boolean)
    .join("\n\n");

  return `%-------------------------
% ATS-Optimized Resume — generated by Job-Tailor
% Based on Jake's Resume template (MIT License)
%-------------------------

\\documentclass[letterpaper,11pt]{article}

\\usepackage{latexsym}
\\usepackage[empty]{fullpage}
\\usepackage{titlesec}
\\usepackage{marvosym}
\\usepackage[usenames,dvipsnames]{color}
\\usepackage{verbatim}
\\usepackage{enumitem}
\\usepackage[hidelinks]{hyperref}
\\usepackage{fancyhdr}
\\usepackage[english]{babel}
\\usepackage{tabularx}
\\usepackage{amsmath}
\\input{glyphtounicode}

\\pagestyle{fancy}
\\fancyhf{}
\\fancyfoot{}
\\renewcommand{\\headrulewidth}{0pt}
\\renewcommand{\\footrulewidth}{0pt}

\\addtolength{\\oddsidemargin}{-0.5in}
\\addtolength{\\evensidemargin}{-0.5in}
\\addtolength{\\textwidth}{1in}
\\addtolength{\\topmargin}{-.5in}
\\addtolength{\\textheight}{1.0in}

\\urlstyle{same}
\\raggedbottom
\\raggedright
\\setlength{\\tabcolsep}{0in}

% Section formatting
\\titleformat{\\section}{
  \\vspace{-4pt}\\scshape\\raggedright\\large
}{}{0em}{}[\\color{black}\\titlerule \\vspace{-5pt}]

\\pdfgentounicode=1

% Custom commands
\\newcommand{\\resumeItem}[1]{
  \\item\\small{
    {#1 \\vspace{-2pt}}
  }
}

\\newcommand{\\resumeSubheading}[4]{
  \\vspace{-2pt}\\item
    \\begin{tabular*}{0.97\\textwidth}[t]{l@{\\extracolsep{\\fill}}r}
      \\textbf{#1} & #2 \\\\
      \\textit{\\small#3} & \\textit{\\small #4} \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeProjectHeading}[2]{
    \\item
    \\begin{tabular*}{0.97\\textwidth}{l@{\\extracolsep{\\fill}}r}
      \\small#1 & #2 \\\\
    \\end{tabular*}\\vspace{-7pt}
}

\\newcommand{\\resumeSubItem}[1]{\\resumeItem{#1}\\vspace{-4pt}}
\\renewcommand\\labelitemii{$\\vcenter{\\hbox{\\tiny$\\bullet$}}$}
\\newcommand{\\resumeSubHeadingListStart}{\\begin{itemize}[leftmargin=0.15in, label={}]}
\\newcommand{\\resumeSubHeadingListEnd}{\\end{itemize}}
\\newcommand{\\resumeItemListStart}{\\begin{itemize}}
\\newcommand{\\resumeItemListEnd}{\\end{itemize}\\vspace{-5pt}}

%-------------------------------------------
\\begin{document}

${buildHeader(data)}

${sections}

%-------------------------------------------
\\end{document}
`;
}
