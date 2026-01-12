import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { RoleResolutionService } from '../common/role-resolution.service';
import {
  AnswerBlockQuestionId,
  AnswerabilityStatus,
  AnswerabilityStatusLevel,
  ProductAnswerabilitySummary,
  ProjectAnswerabilityResponse,
  ANSWER_QUESTION_IDS,
} from '@engineo/shared';

/**
 * Question classification result for per-question heuristic detection.
 */
type QuestionClassification = 'missing' | 'weak' | 'strong';

/**
 * Per-question classification for a product.
 */
type ProductQuestionClassifications = Record<AnswerBlockQuestionId, QuestionClassification>;

/**
 * Generic phrase patterns that indicate vague, non-specific content.
 */
const GENERIC_PHRASES = [
  'great product',
  'you will love',
  "you'll love",
  'high quality',
  'best quality',
  'amazing',
  'awesome',
  'fantastic',
  'incredible',
  'wonderful',
  'perfect for everyone',
  'must have',
  'must-have',
  'buy now',
  'order now',
  'limited time',
  'best seller',
  'top rated',
];

/**
 * Audience indicator phrases for who_is_it_for detection.
 */
const AUDIENCE_INDICATORS = [
  'for kids',
  'for children',
  'for women',
  'for men',
  'for adults',
  'for seniors',
  'for beginners',
  'for professionals',
  'for runners',
  'for athletes',
  'for travelers',
  'for home',
  'for office',
  'for outdoor',
  'for indoor',
  'designed for',
  'perfect for',
  'ideal for',
  'great for',
  'suitable for',
  'intended for',
  'made for',
];

/**
 * Usage indicator phrases for how_is_it_used detection.
 */
const USAGE_INDICATORS = [
  'use it to',
  'use this to',
  'how to use',
  'simply plug',
  'just plug',
  'wear this',
  'wear it',
  'apply to',
  'apply on',
  'install',
  'assemble',
  'set up',
  'setup',
  'connect to',
  'attach to',
  'place on',
  'put on',
  'ideal for',
  'perfect for',
  'great for',
  'instructions',
  'step by step',
  'step-by-step',
];

/**
 * Problem/solution indicator phrases.
 */
const PROBLEM_SOLUTION_INDICATORS = [
  'helps reduce',
  'helps prevent',
  'prevents',
  'reduces',
  'eliminates',
  'solves',
  'fixes',
  'addresses',
  'tackles',
  'overcomes',
  'no more',
  'say goodbye to',
  'tired of',
  'struggling with',
  'pain point',
  'problem',
  'issue',
  'challenge',
  'relief from',
  'protection from',
  'protects against',
];

/**
 * Differentiation indicator phrases.
 */
const DIFFERENTIATION_INDICATORS = [
  'unlike other',
  'unlike others',
  'unique because',
  'only product that',
  'the only',
  'first of its kind',
  'one of a kind',
  'patented',
  'proprietary',
  'exclusive',
  'what sets us apart',
  'what makes us different',
  'compared to',
  'better than',
  'superior to',
  'more than',
  'stands out',
];

/**
 * Inclusion indicator phrases for whats_included detection.
 */
const INCLUSION_INDICATORS = [
  'includes',
  'included',
  'comes with',
  'contains',
  'set of',
  'pack of',
  'bundle',
  'kit includes',
  'package includes',
  'box contains',
  'accessories',
  'components',
  'parts included',
  'everything you need',
  'all-in-one',
];

/**
 * Material/spec indicator patterns.
 */
const MATERIAL_KEYWORDS = [
  'cotton',
  'polyester',
  'silk',
  'wool',
  'leather',
  'faux leather',
  'synthetic',
  'nylon',
  'spandex',
  'linen',
  'bamboo',
  'organic',
  'steel',
  'stainless steel',
  'aluminum',
  'aluminium',
  'wood',
  'wooden',
  'plastic',
  'rubber',
  'silicone',
  'glass',
  'ceramic',
  'metal',
  'carbon fiber',
  'titanium',
  'copper',
  'brass',
  'zinc',
];

/**
 * Care/safety indicator phrases.
 */
const CARE_SAFETY_INDICATORS = [
  'machine wash',
  'hand wash',
  'dry clean',
  'do not bleach',
  'tumble dry',
  'air dry',
  'iron',
  'wipe clean',
  'spot clean',
  'dishwasher safe',
  'microwave safe',
  'oven safe',
  'freezer safe',
  'care instructions',
  'warning',
  'caution',
  'keep away from',
  'not suitable for',
  'adult supervision',
  'choking hazard',
  'flammable',
  'non-toxic',
  'bpa free',
  'bpa-free',
  'safety',
  'maintenance',
];

/**
 * [ROLES-3 FIXUP-3] Answer Engine Service
 * Updated with membership-aware access control (any ProjectMember can view).
 */
@Injectable()
export class AnswerEngineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly roleResolution: RoleResolutionService,
  ) {}

  /**
   * Returns Answer Engine answerability detection summary for a project.
   * This analyzes products using heuristics over existing text fields.
   */
  async getProjectAnswerability(
    projectId: string,
    userId: string,
  ): Promise<ProjectAnswerabilityResponse> {
    // 1. Project ownership validation
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    // [ROLES-3 FIXUP-3] Membership-aware access (any ProjectMember can view)
    await this.roleResolution.assertProjectAccess(projectId, userId);

    // 2. Load products for the project
    const products = await this.prisma.product.findMany({
      where: { projectId },
      select: {
        id: true,
        title: true,
        description: true,
        seoTitle: true,
        seoDescription: true,
      },
    });

    // 3. Analyze each product
    const productSummaries: ProductAnswerabilitySummary[] = products.map((product) => {
      const status = this.computeAnswerabilityForProduct(product);
      return {
        productId: product.id,
        productTitle: product.title || 'Untitled Product',
        status,
      };
    });

    // 4. Compute project-level aggregate
    const overallStatus = this.computeOverallStatus(productSummaries);

    return {
      projectId,
      generatedAt: new Date().toISOString(),
      overallStatus,
      products: productSummaries,
    };
  }

  /**
   * Analyzes a single product's answerability using heuristics.
   * Public to allow reuse by AnswerGenerationService.
   */
  computeAnswerabilityForProduct(product: {
    id: string;
    title: string | null;
    description: string | null;
    seoTitle: string | null;
    seoDescription: string | null;
  }): AnswerabilityStatus {
    // Build combined description string
    const description = product.seoDescription || product.description || '';
    const title = product.seoTitle || product.title || '';
    const combinedText = `${title} ${description}`.toLowerCase();

    // Compute text metrics
    const wordCount = this.getWordCount(combinedText);
    const isVague = this.isVagueContent(combinedText, wordCount);

    // Classify each question
    const classifications = this.classifyAllQuestions(title, description, combinedText, wordCount, isVague);

    // Build AnswerabilityStatus from classifications
    const missingQuestions: AnswerBlockQuestionId[] = [];
    const weakQuestions: AnswerBlockQuestionId[] = [];
    let strongCount = 0;

    for (const questionId of ANSWER_QUESTION_IDS) {
      const classification = classifications[questionId];
      if (classification === 'missing') {
        missingQuestions.push(questionId);
      } else if (classification === 'weak') {
        weakQuestions.push(questionId);
      } else {
        strongCount++;
      }
    }

    // Compute answerability score
    const answerabilityScore = this.computeAnswerabilityScore(strongCount, weakQuestions.length, missingQuestions.length);

    // Determine status level
    const status = this.determineStatusLevel(strongCount, missingQuestions.length, weakQuestions.length);

    return {
      status,
      missingQuestions,
      weakQuestions,
      answerabilityScore,
    };
  }

  /**
   * Classifies all 10 canonical questions for a product.
   */
  private classifyAllQuestions(
    title: string,
    description: string,
    combinedText: string,
    wordCount: number,
    isVague: boolean,
  ): ProductQuestionClassifications {
    const descLower = description.toLowerCase();
    const titleLower = title.toLowerCase();

    return {
      what_is_it: this.classifyWhatIsIt(titleLower, descLower, wordCount, isVague),
      who_is_it_for: this.classifyWhoIsItFor(descLower, combinedText),
      why_choose_this: this.classifyWhyChooseThis(descLower, combinedText, wordCount, isVague),
      key_features: this.classifyKeyFeatures(descLower, combinedText),
      how_is_it_used: this.classifyHowIsItUsed(descLower, combinedText),
      problems_it_solves: this.classifyProblemsItSolves(descLower, combinedText),
      what_makes_it_different: this.classifyWhatMakesItDifferent(descLower, combinedText),
      whats_included: this.classifyWhatsIncluded(descLower, combinedText),
      materials_and_specs: this.classifyMaterialsAndSpecs(descLower, combinedText),
      care_safety_instructions: this.classifyCareSafetyInstructions(descLower, combinedText),
    };
  }

  /**
   * what_is_it: Strong if product has a non-empty title and description with concrete content.
   */
  private classifyWhatIsIt(
    title: string,
    description: string,
    wordCount: number,
    isVague: boolean,
  ): QuestionClassification {
    if (!title.trim() && !description.trim()) {
      return 'missing';
    }

    if (wordCount < 5) {
      return 'missing';
    }

    if (isVague && wordCount < 20) {
      return 'weak';
    }

    if (wordCount >= 15 && !isVague) {
      return 'strong';
    }

    if (title.trim() && description.trim() && wordCount >= 10) {
      return 'strong';
    }

    return 'weak';
  }

  /**
   * who_is_it_for: Strong if description contains audience indicators.
   */
  private classifyWhoIsItFor(description: string, combinedText: string): QuestionClassification {
    const hasStrongIndicator = AUDIENCE_INDICATORS.some((phrase) =>
      combinedText.includes(phrase),
    );

    if (hasStrongIndicator) {
      return 'strong';
    }

    // Check for weak hints (e.g., generic "everyone" or implicit audience)
    const weakHints = ['everyone', 'anyone', 'all ages', 'universal'];
    const hasWeakHint = weakHints.some((hint) => combinedText.includes(hint));

    if (hasWeakHint) {
      return 'weak';
    }

    return 'missing';
  }

  /**
   * why_choose_this: Similar to what_is_it but focused on value proposition.
   */
  private classifyWhyChooseThis(
    description: string,
    combinedText: string,
    wordCount: number,
    isVague: boolean,
  ): QuestionClassification {
    // Look for value proposition indicators
    const valueIndicators = [
      'benefit',
      'advantage',
      'best',
      'top',
      'premium',
      'quality',
      'value',
      'save',
      'efficient',
      'effective',
      'reliable',
      'durable',
      'guaranteed',
      'warranty',
    ];

    const hasValueIndicator = valueIndicators.some((ind) => combinedText.includes(ind));

    if (hasValueIndicator && wordCount >= 20 && !isVague) {
      return 'strong';
    }

    if (hasValueIndicator) {
      return 'weak';
    }

    if (wordCount >= 30 && !isVague) {
      return 'weak';
    }

    return 'missing';
  }

  /**
   * key_features: Strong if description includes multiple feature-like phrases.
   */
  private classifyKeyFeatures(description: string, combinedText: string): QuestionClassification {
    const featureIndicators = [
      'feature',
      'features',
      'designed with',
      'built with',
      'equipped with',
      'includes',
      'comes with',
      'offers',
      'provides',
      'boasts',
      'specifications',
      'specs',
    ];

    const matchCount = featureIndicators.filter((ind) => combinedText.includes(ind)).length;

    // Check for bullet-like patterns (common in descriptions)
    const hasBulletPattern = /[-•*]\s*\w+/.test(description);

    if (matchCount >= 2 || (matchCount >= 1 && hasBulletPattern)) {
      return 'strong';
    }

    if (matchCount >= 1 || hasBulletPattern) {
      return 'weak';
    }

    // Check for enumeration patterns
    const hasEnumeration = /\d+\s*(features?|items?|things?)/.test(combinedText);
    if (hasEnumeration) {
      return 'weak';
    }

    return 'missing';
  }

  /**
   * how_is_it_used: Strong if description contains usage verbs and phrases.
   */
  private classifyHowIsItUsed(description: string, combinedText: string): QuestionClassification {
    const matchCount = USAGE_INDICATORS.filter((ind) => combinedText.includes(ind)).length;

    if (matchCount >= 2) {
      return 'strong';
    }

    if (matchCount >= 1) {
      return 'weak';
    }

    return 'missing';
  }

  /**
   * problems_it_solves: Strong if description mentions pain points and solutions.
   */
  private classifyProblemsItSolves(description: string, combinedText: string): QuestionClassification {
    const matchCount = PROBLEM_SOLUTION_INDICATORS.filter((ind) =>
      combinedText.includes(ind),
    ).length;

    if (matchCount >= 2) {
      return 'strong';
    }

    if (matchCount >= 1) {
      return 'weak';
    }

    // Check for generic benefit language
    const genericBenefits = ["you'll feel", 'feel better', 'feel great', 'improve your'];
    const hasGenericBenefit = genericBenefits.some((phrase) => combinedText.includes(phrase));

    if (hasGenericBenefit) {
      return 'weak';
    }

    return 'missing';
  }

  /**
   * what_makes_it_different: Strong if description calls out differentiators.
   */
  private classifyWhatMakesItDifferent(
    description: string,
    combinedText: string,
  ): QuestionClassification {
    const matchCount = DIFFERENTIATION_INDICATORS.filter((ind) =>
      combinedText.includes(ind),
    ).length;

    if (matchCount >= 1) {
      return 'strong';
    }

    // Check for generic "best in class" without specifics
    const genericClaims = ['best in class', 'industry leading', 'world class', 'top of the line'];
    const hasGenericClaim = genericClaims.some((phrase) => combinedText.includes(phrase));

    if (hasGenericClaim) {
      return 'weak';
    }

    return 'missing';
  }

  /**
   * whats_included: Strong if description lists contents/components.
   */
  private classifyWhatsIncluded(description: string, combinedText: string): QuestionClassification {
    const matchCount = INCLUSION_INDICATORS.filter((ind) => combinedText.includes(ind)).length;

    if (matchCount >= 2) {
      return 'strong';
    }

    if (matchCount >= 1) {
      return 'weak';
    }

    return 'missing';
  }

  /**
   * materials_and_specs: Strong if description contains concrete materials and specs.
   */
  private classifyMaterialsAndSpecs(
    description: string,
    combinedText: string,
  ): QuestionClassification {
    const materialMatches = MATERIAL_KEYWORDS.filter((kw) => combinedText.includes(kw)).length;

    // Check for dimensions/measurements
    const hasDimensions = /\d+\s*(cm|mm|in|inch|inches|ft|feet|m|kg|g|lb|lbs|oz|ml|l|liters?|gallons?)/.test(
      combinedText,
    );

    // Check for generic "high-quality materials"
    const hasGenericMaterial = combinedText.includes('high-quality material') ||
      combinedText.includes('quality materials') ||
      combinedText.includes('premium material');

    if (materialMatches >= 2 || (materialMatches >= 1 && hasDimensions)) {
      return 'strong';
    }

    if (materialMatches >= 1 || hasDimensions) {
      return 'weak';
    }

    if (hasGenericMaterial) {
      return 'weak';
    }

    return 'missing';
  }

  /**
   * care_safety_instructions: Strong if description includes care or safety info.
   */
  private classifyCareSafetyInstructions(
    description: string,
    combinedText: string,
  ): QuestionClassification {
    const matchCount = CARE_SAFETY_INDICATORS.filter((ind) => combinedText.includes(ind)).length;

    if (matchCount >= 2) {
      return 'strong';
    }

    if (matchCount >= 1) {
      return 'weak';
    }

    return 'missing';
  }

  /**
   * Computes the word count of a text string.
   */
  private getWordCount(text: string): number {
    return text.trim().split(/\s+/).filter((word) => word.length > 0).length;
  }

  /**
   * Determines if content is vague (dominated by generic phrases).
   */
  private isVagueContent(text: string, wordCount: number): boolean {
    if (wordCount < 15) {
      // Short content is more likely to be vague
      const genericCount = GENERIC_PHRASES.filter((phrase) => text.includes(phrase)).length;
      return genericCount >= 1;
    }

    // For longer content, check ratio of generic phrases
    const genericCount = GENERIC_PHRASES.filter((phrase) => text.includes(phrase)).length;
    return genericCount >= 3;
  }

  /**
   * Computes the answerability score (0-100).
   */
  private computeAnswerabilityScore(
    strongCount: number,
    weakCount: number,
    _missingCount: number,
  ): number {
    const totalQuestions = ANSWER_QUESTION_IDS.length; // 10

    // Base score from non-missing questions
    const nonMissingCount = strongCount + weakCount;
    const coverageRatio = nonMissingCount / totalQuestions;

    // Strong questions contribute fully, weak questions contribute partially
    const qualityScore = (strongCount + weakCount * 0.5) / totalQuestions;

    // Combine coverage and quality
    const rawScore = (coverageRatio * 40) + (qualityScore * 60);

    // Clamp to 0-100
    return Math.max(0, Math.min(100, Math.round(rawScore)));
  }

  /**
   * Determines the overall status level based on question classifications.
   */
  private determineStatusLevel(
    strongCount: number,
    missingCount: number,
    weakCount: number,
  ): AnswerabilityStatusLevel {
    const totalQuestions = ANSWER_QUESTION_IDS.length; // 10
    const answeredCount = strongCount + weakCount;

    // answer_ready: Most questions strong, no missing
    if (strongCount >= 8 && missingCount === 0) {
      return 'answer_ready';
    }

    // needs_answers: Fewer than 3 questions can be classified as answered
    if (answeredCount < 3) {
      return 'needs_answers';
    }

    // partially_answer_ready: In between
    return 'partially_answer_ready';
  }

  /**
   * Computes the overall project-level status from all products.
   */
  private computeOverallStatus(products: ProductAnswerabilitySummary[]): AnswerabilityStatus {
    if (products.length === 0) {
      return {
        status: 'needs_answers',
        missingQuestions: [...ANSWER_QUESTION_IDS],
        weakQuestions: [],
        answerabilityScore: 0,
      };
    }

    // Aggregate missing and weak questions (de-duplicated)
    const allMissing = new Set<AnswerBlockQuestionId>();
    const allWeak = new Set<AnswerBlockQuestionId>();
    let totalScore = 0;
    let answerReadyCount = 0;
    let needsAnswersCount = 0;

    for (const product of products) {
      product.status.missingQuestions.forEach((q) => allMissing.add(q));
      product.status.weakQuestions.forEach((q) => allWeak.add(q));
      totalScore += product.status.answerabilityScore ?? 0;

      if (product.status.status === 'answer_ready') {
        answerReadyCount++;
      } else if (product.status.status === 'needs_answers') {
        needsAnswersCount++;
      }
    }

    // Average score
    const avgScore = Math.round(totalScore / products.length);

    // Determine aggregate status
    let status: AnswerabilityStatusLevel;
    const answerReadyRatio = answerReadyCount / products.length;
    const needsAnswersRatio = needsAnswersCount / products.length;

    if (answerReadyRatio >= 0.8 && avgScore >= 70) {
      status = 'answer_ready';
    } else if (needsAnswersRatio > 0.5) {
      status = 'needs_answers';
    } else {
      status = 'partially_answer_ready';
    }

    return {
      status,
      missingQuestions: Array.from(allMissing),
      weakQuestions: Array.from(allWeak),
      answerabilityScore: avgScore,
    };
  }
}
