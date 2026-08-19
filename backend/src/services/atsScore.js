// Lightweight ATS-style scoring — no external API, pure heuristics.
// Weighted: keyword overlap (60%) + standard sections present (20%) + formatting simplicity (20%)

const STANDARD_SECTIONS = ['experience', 'education', 'skills', 'summary', 'projects'];

function extractKeywords(text) {
  return new Set(
    (text || '')
      .toLowerCase()
      .replace(/[^a-z0-9+.\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
}

function keywordOverlapScore(resumeText, jobDescription, requiredSkills = []) {
  const resumeWords = extractKeywords(resumeText);
  const jobWords = extractKeywords(jobDescription);
  const skillWords = requiredSkills.map((s) => s.toLowerCase());

  // Combine job description keywords with explicit required skills as the target set
  const targetSet = new Set([...jobWords, ...skillWords]);
  if (targetSet.size === 0) return 0;

  let hits = 0;
  targetSet.forEach((word) => {
    if (resumeWords.has(word)) hits += 1;
  });

  return Math.min(100, Math.round((hits / targetSet.size) * 100));
}

function sectionScore(resumeText) {
  const lower = (resumeText || '').toLowerCase();
  const present = STANDARD_SECTIONS.filter((section) => lower.includes(section));
  return Math.round((present.length / STANDARD_SECTIONS.length) * 100);
}

function formattingScore(resumeText) {
  // Heuristic only: penalize very short resumes or resumes that look like a single unbroken block
  if (!resumeText || resumeText.trim().length < 50) return 40;
  const lineBreaks = (resumeText.match(/\n/g) || []).length;
  if (lineBreaks < 3) return 60; // likely pasted as one big paragraph
  return 100;
}

function getAtsScore(resumeText, jobDescription, requiredSkills = []) {
  const keyword = keywordOverlapScore(resumeText, jobDescription, requiredSkills);
  const sections = sectionScore(resumeText);
  const formatting = formattingScore(resumeText);

  const weighted = keyword * 0.6 + sections * 0.2 + formatting * 0.2;
  return {
    atsScore: Math.round(weighted),
    breakdown: { keywordOverlap: keyword, sectionsPresent: sections, formatting },
  };
}

module.exports = { getAtsScore };
