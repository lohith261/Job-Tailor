import type {
  JobMatchBreakdownItem,
  JobMatchDetails,
  JobPriorityInsights,
  RawJob,
  SearchConfigData,
} from "@/types";

const WEIGHTS = {
  title: 25,
  location: 15,
  salary: 10,
  keywords: 15,
  skills: 20,
  experience: 8,
  jobType: 4,
  preferredCompany: 3,
  blacklist: 0, // penalty-only, no positive weight
};

const EXPERIENCE_LEVELS = ["intern", "junior", "mid", "senior", "lead", "executive"];

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

function makeItem(
  key: JobMatchBreakdownItem["key"],
  label: string,
  score: number,
  maxScore: number,
  reason: string
): JobMatchBreakdownItem {
  return {
    key,
    label,
    score,
    maxScore,
    reason,
    tone: score < 0 ? "negative" : score === 0 ? "neutral" : "positive",
  };
}

function scoreTitleMatch(job: RawJob, config: SearchConfigData): JobMatchBreakdownItem {
  if (config.titles.length === 0) {
    return makeItem(
      "title",
      "Title Match",
      WEIGHTS.title,
      WEIGHTS.title,
      "No preferred titles set, so title matching gets full credit."
    );
  }

  const jobTitle = normalize(job.title);

  for (const title of config.titles) {
    const configTitle = normalize(title);
    if (jobTitle === configTitle) {
      return makeItem(
        "title",
        "Title Match",
        WEIGHTS.title,
        WEIGHTS.title,
        `Exact match with your preferred title "${title}".`
      );
    }
  }

  for (const title of config.titles) {
    const configTitle = normalize(title);
    if (jobTitle.includes(configTitle) || configTitle.includes(jobTitle)) {
      return makeItem(
        "title",
        "Title Match",
        20,
        WEIGHTS.title,
        `Close match to your preferred title "${title}".`
      );
    }
  }

  // Check for related terms — split both sides into words and look for overlap
  const jobWords = new Set(jobTitle.split(/\s+/));
  for (const title of config.titles) {
    const configWords = normalize(title).split(/\s+/);
    const overlap = configWords.filter((w) => jobWords.has(w));
    if (overlap.length > 0) {
      return makeItem(
        "title",
        "Title Match",
        10,
        WEIGHTS.title,
        `Some title overlap with "${title}" (${overlap.join(", ")}).`
      );
    }
  }

  return makeItem(
    "title",
    "Title Match",
    0,
    WEIGHTS.title,
    "This title does not closely match your target roles."
  );
}

function scoreLocationMatch(job: RawJob, config: SearchConfigData): JobMatchBreakdownItem {
  if (config.locations.length === 0 && !config.locationType) {
    return makeItem(
      "location",
      "Location Match",
      WEIGHTS.location,
      WEIGHTS.location,
      "No location preferences set, so location gets full credit."
    );
  }

  // Remote match
  const jobIsRemote =
    normalize(job.locationType ?? "").includes("remote") ||
    normalize(job.location ?? "").includes("remote");
  const userWantsRemote = normalize(config.locationType ?? "").includes("remote");

  if (jobIsRemote && userWantsRemote) {
    return makeItem(
      "location",
      "Location Match",
      WEIGHTS.location,
      WEIGHTS.location,
      "Remote role matches your remote preference."
    );
  }

  if (config.locations.length === 0) {
    return makeItem(
      "location",
      "Location Match",
      0,
      WEIGHTS.location,
      "Location type does not match your current preference."
    );
  }

  const jobLocation = normalize(job.location ?? "");
  if (!jobLocation) {
    return makeItem(
      "location",
      "Location Match",
      0,
      WEIGHTS.location,
      "Job location is missing, so location fit is unclear."
    );
  }

  // Exact city match
  for (const loc of config.locations) {
    const configLoc = normalize(loc);
    if (jobLocation.includes(configLoc) || configLoc.includes(jobLocation)) {
      return makeItem(
        "location",
        "Location Match",
        WEIGHTS.location,
        WEIGHTS.location,
        `Location matches your preference for "${loc}".`
      );
    }
  }

  // Same country heuristic — compare the last comma-separated segment
  const jobCountry = jobLocation.split(",").pop()?.trim() ?? "";
  for (const loc of config.locations) {
    const configCountry = normalize(loc).split(",").pop()?.trim() ?? "";
    if (jobCountry && configCountry && jobCountry === configCountry) {
      return makeItem(
        "location",
        "Location Match",
        10,
        WEIGHTS.location,
        `Country matches your preferred region "${loc}".`
      );
    }
  }

  return makeItem(
    "location",
    "Location Match",
    0,
    WEIGHTS.location,
    "Location does not match your saved preferences."
  );
}

function scoreSalaryMatch(job: RawJob, config: SearchConfigData): JobMatchBreakdownItem {
  const hasConfigRange = config.salaryMin != null || config.salaryMax != null;
  if (!hasConfigRange) {
    return makeItem(
      "salary",
      "Salary Fit",
      WEIGHTS.salary,
      WEIGHTS.salary,
      "No salary range set, so salary gets full credit."
    );
  }

  const hasJobSalary = job.salaryMin != null || job.salaryMax != null;
  if (!hasJobSalary) {
    return makeItem(
      "salary",
      "Salary Fit",
      8,
      WEIGHTS.salary,
      "Salary is not listed, so this gets partial credit."
    );
  }

  const jobMin = job.salaryMin ?? 0;
  const jobMax = job.salaryMax ?? Infinity;
  const configMin = config.salaryMin ?? 0;
  const configMax = config.salaryMax ?? Infinity;

  // Fully within range
  if (jobMin >= configMin && jobMax <= configMax) {
    return makeItem(
      "salary",
      "Salary Fit",
      WEIGHTS.salary,
      WEIGHTS.salary,
      "Listed salary falls within your preferred range."
    );
  }

  // Overlapping
  if (jobMin <= configMax && jobMax >= configMin) {
    return makeItem(
      "salary",
      "Salary Fit",
      10,
      WEIGHTS.salary,
      "Salary overlaps with your preferred range."
    );
  }

  return makeItem(
    "salary",
    "Salary Fit",
    0,
    WEIGHTS.salary,
    "Listed salary is outside your preferred range."
  );
}

function scoreKeywordsMatch(job: RawJob, config: SearchConfigData): JobMatchBreakdownItem {
  const searchableText = normalize(
    [job.title, job.description, ...(job.tags ?? [])].filter(Boolean).join(" ")
  );

  let score = 0;
  const matchedKeywords: string[] = [];
  const excludedHits: string[] = [];

  // Include keywords — proportional scoring
  if (config.includeKeywords.length > 0) {
    const pointsPerKeyword = WEIGHTS.keywords / config.includeKeywords.length;
    for (const keyword of config.includeKeywords) {
      if (searchableText.includes(normalize(keyword))) {
        score += pointsPerKeyword;
        matchedKeywords.push(keyword);
      }
    }
  } else {
    score = WEIGHTS.keywords;
  }

  // Exclude keywords — each found subtracts 10 from total
  for (const keyword of config.excludeKeywords) {
    if (searchableText.includes(normalize(keyword))) {
      score -= 10;
      excludedHits.push(keyword);
    }
  }

  if (config.includeKeywords.length === 0 && excludedHits.length === 0) {
    return makeItem(
      "keywords",
      "Keyword Fit",
      WEIGHTS.keywords,
      WEIGHTS.keywords,
      "No include keywords are configured, so keywords get full credit."
    );
  }

  const clamped = Math.max(-WEIGHTS.keywords, Math.min(WEIGHTS.keywords, score));
  let reason: string;
  if (config.includeKeywords.length === 0) {
    reason = "No include keywords configured.";
  } else if (matchedKeywords.length > 0) {
    reason = `Matched keywords: ${matchedKeywords.slice(0, 4).join(", ")}.`;
  } else {
    reason = "None of your preferred keywords were found.";
  }
  if (excludedHits.length > 0) {
    reason += ` Excluded terms found: ${excludedHits.slice(0, 3).join(", ")}.`;
  }

  return makeItem("keywords", "Keyword Fit", clamped, WEIGHTS.keywords, reason);
}

function scoreExperienceMatch(job: RawJob, config: SearchConfigData): JobMatchBreakdownItem {
  if (!config.experienceLevel) {
    return makeItem(
      "experience",
      "Experience Fit",
      WEIGHTS.experience,
      WEIGHTS.experience,
      "No experience level preference is set."
    );
  }
  if (!job.experienceLevel) {
    return makeItem(
      "experience",
      "Experience Fit",
      0,
      WEIGHTS.experience,
      "Experience level is not listed for this role."
    );
  }

  const jobLevel = normalize(job.experienceLevel);
  const configLevel = normalize(config.experienceLevel);

  if (jobLevel === configLevel) {
    return makeItem(
      "experience",
      "Experience Fit",
      WEIGHTS.experience,
      WEIGHTS.experience,
      `Experience level matches your "${config.experienceLevel}" preference.`
    );
  }

  const jobIndex = EXPERIENCE_LEVELS.indexOf(jobLevel);
  const configIndex = EXPERIENCE_LEVELS.indexOf(configLevel);

  if (jobIndex !== -1 && configIndex !== -1 && Math.abs(jobIndex - configIndex) === 1) {
    return makeItem(
      "experience",
      "Experience Fit",
      5,
      WEIGHTS.experience,
      `Experience level is close to your "${config.experienceLevel}" preference.`
    );
  }

  return makeItem(
    "experience",
    "Experience Fit",
    0,
    WEIGHTS.experience,
    `Experience level does not match your "${config.experienceLevel}" preference.`
  );
}

function scoreBlacklist(job: RawJob, config: SearchConfigData): JobMatchBreakdownItem {
  if (config.blacklistedCompanies.length === 0) {
    return makeItem(
      "blacklist",
      "Company Preference",
      WEIGHTS.blacklist,
      WEIGHTS.blacklist,
      "No companies are blacklisted."
    );
  }

  const jobCompany = normalize(job.company);

  for (const company of config.blacklistedCompanies) {
    if (jobCompany === normalize(company)) {
      return makeItem(
        "blacklist",
        "Company Preference",
        -100,
        WEIGHTS.blacklist,
        `Company "${job.company}" is on your blacklist.`
      );
    }
  }

  return makeItem(
    "blacklist",
    "Company Preference",
    WEIGHTS.blacklist,
    WEIGHTS.blacklist,
    "This company is not on your blacklist."
  );
}

function scoreSkillsMatch(job: RawJob, config: SearchConfigData): JobMatchBreakdownItem {
  if (!config.skills || config.skills.length === 0) {
    return makeItem("skills", "Skills Match", WEIGHTS.skills, WEIGHTS.skills, "No skills configured — skills get full credit.");
  }

  const searchableText = normalize([job.title, job.description, ...(job.tags ?? [])].filter(Boolean).join(" "));
  const pointsPerSkill = WEIGHTS.skills / config.skills.length;
  let score = 0;
  const matched: string[] = [];
  const missing: string[] = [];

  for (const skill of config.skills) {
    if (searchableText.includes(normalize(skill))) {
      score += pointsPerSkill;
      matched.push(skill);
    } else {
      missing.push(skill);
    }
  }

  const clamped = Math.min(WEIGHTS.skills, score);
  let reason: string;
  if (matched.length === config.skills.length) {
    reason = `All your skills found: ${matched.slice(0, 4).join(", ")}.`;
  } else if (matched.length > 0) {
    reason = `Skills matched: ${matched.slice(0, 3).join(", ")}. Missing: ${missing.slice(0, 3).join(", ")}.`;
  } else {
    reason = `None of your skills (${missing.slice(0, 4).join(", ")}) were found in this job.`;
  }

  return makeItem("skills", "Skills Match", Math.round(clamped), WEIGHTS.skills, reason);
}

function scoreJobType(job: RawJob, config: SearchConfigData): JobMatchBreakdownItem {
  if (!config.jobType || config.jobType === "any") {
    return makeItem("jobType", "Job Type", WEIGHTS.jobType, WEIGHTS.jobType, "No job type preference set.");
  }

  const jobText = normalize([job.title, job.description ?? ""].join(" "));
  const configType = normalize(config.jobType);

  // Map config types to search terms
  const typeTerms: Record<string, string[]> = {
    "full-time": ["full time", "full-time", "permanent", "regular"],
    "part-time": ["part time", "part-time"],
    "contract": ["contract", "freelance", "consultant", "c2h", "c2c"],
    "internship": ["intern", "internship", "trainee"],
  };

  const terms = typeTerms[configType] ?? [configType];
  const matches = terms.some((t) => jobText.includes(t));

  if (matches) {
    return makeItem("jobType", "Job Type", WEIGHTS.jobType, WEIGHTS.jobType, `Job type matches your "${config.jobType}" preference.`);
  }

  return makeItem("jobType", "Job Type", 0, WEIGHTS.jobType, `Job type doesn't match your "${config.jobType}" preference.`);
}

function scorePreferredCompany(job: RawJob, config: SearchConfigData): JobMatchBreakdownItem {
  if (!config.preferredCompanies || config.preferredCompanies.length === 0) {
    return makeItem("preferredCompany", "Preferred Company", 0, WEIGHTS.preferredCompany, "No preferred companies set.");
  }

  const jobCompany = normalize(job.company);
  for (const company of config.preferredCompanies) {
    if (jobCompany.includes(normalize(company)) || normalize(company).includes(jobCompany)) {
      return makeItem("preferredCompany", "Preferred Company", WEIGHTS.preferredCompany, WEIGHTS.preferredCompany, `"${job.company}" is on your preferred companies list — priority match!`);
    }
  }

  return makeItem("preferredCompany", "Preferred Company", 0, WEIGHTS.preferredCompany, "Not a preferred company.");
}

export function calculateMatchDetails(
  job: RawJob,
  config: SearchConfigData
): JobMatchDetails {
  const breakdown = [
    scoreTitleMatch(job, config),
    scoreSkillsMatch(job, config),
    scoreLocationMatch(job, config),
    scoreSalaryMatch(job, config),
    scoreKeywordsMatch(job, config),
    scoreExperienceMatch(job, config),
    scoreJobType(job, config),
    scorePreferredCompany(job, config),
    scoreBlacklist(job, config),
  ];

  const total = breakdown.reduce((sum, item) => sum + item.score, 0);

  return {
    totalScore: Math.max(0, Math.min(100, Math.round(total))),
    breakdown,
  };
}

export function calculateMatchScore(job: RawJob, config: SearchConfigData): number {
  return calculateMatchDetails(job, config).totalScore;
}

export function calculatePriorityInsights(
  job: RawJob,
  matchDetails: JobMatchDetails
): JobPriorityInsights {
  const title = matchDetails.breakdown.find((item) => item.key === "title")?.score ?? 0;
  const location = matchDetails.breakdown.find((item) => item.key === "location")?.score ?? 0;
  const salary = matchDetails.breakdown.find((item) => item.key === "salary")?.score ?? 0;
  const keywords = matchDetails.breakdown.find((item) => item.key === "keywords")?.score ?? 0;
  const experience = matchDetails.breakdown.find((item) => item.key === "experience")?.score ?? 0;
  const blacklist = matchDetails.breakdown.find((item) => item.key === "blacklist")?.score ?? 0;

  let effortScore = 25;
  if (keywords <= 0) effortScore += 35;
  else if (keywords < 10) effortScore += 20;
  if (title < 20) effortScore += 20;
  if (experience === 0) effortScore += 10;
  if (salary === 0 && (job.salaryMin != null || job.salaryMax != null)) effortScore += 10;
  if (location === 0) effortScore += 10;
  if (!job.description) effortScore += 5;
  if (blacklist < 0) effortScore = 100;
  effortScore = Math.max(0, Math.min(100, effortScore));

  const freshnessBonus = job.postedAt
    ? Math.max(0, 15 - Math.floor((Date.now() - job.postedAt.getTime()) / 86400000))
    : 5;
  const priorityScore = Math.max(
    0,
    Math.min(100, Math.round(matchDetails.totalScore - effortScore * 0.35 + freshnessBonus))
  );

  let recommendation: JobPriorityInsights["recommendation"] = "low-priority";
  let reason = "Low alignment or high effort makes this a lower-priority application.";
  if (blacklist < 0) {
    recommendation = "low-priority";
    reason = "This company is blacklisted, so it should stay low priority.";
  } else if (matchDetails.totalScore >= 78 && effortScore <= 40) {
    recommendation = "quick-win";
    reason = "Strong fit with relatively low tailoring effort makes this a quick win.";
  } else if (matchDetails.totalScore >= 65 && priorityScore >= 60) {
    recommendation = "best-bet";
    reason = "Solid fit and manageable effort make this one of the better bets this week.";
  } else if (matchDetails.totalScore >= 50) {
    recommendation = "stretch";
    reason = "Promising role, but it likely needs more resume tailoring before applying.";
  }

  return {
    effortScore,
    priorityScore,
    recommendation,
    effortLabel:
      effortScore <= 35 ? "Low Effort" : effortScore <= 65 ? "Medium Effort" : "High Effort",
    reason,
  };
}
