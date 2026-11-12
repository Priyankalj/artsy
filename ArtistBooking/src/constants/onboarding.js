import { toMoneyNumber } from '../utils/money';

export const ARTIST_STEP_BY_INDEX = [
  'profile',
  'category',
  'experience',
  'portfolio',
  'pricing',
];

export const CUSTOMER_STEP_BY_INDEX = ['name', 'interests', 'location'];

export const ARTIST_STEP_INDEX = {
  profile: 0,
  category: 1,
  experience: 2,
  portfolio: 3,
  pricing: 4,
};

export const CUSTOMER_STEP_INDEX = {
  name: 0,
  interests: 1,
  location: 2,
};

export const ARTIST_FLOW_STEPS = [
  'Profile',
  'Category',
  'Experience',
  'Portfolio',
  'Pricing',
  'Aadhaar',
  'Selfie',
  'Bank',
];

export const CUSTOMER_FLOW_STEPS = [
  'Name',
  'Interests',
  'Location',
  'Aadhaar',
  'Selfie',
];

export function flowStepsForRole(role) {
  return role === 'user' ? CUSTOMER_FLOW_STEPS : ARTIST_FLOW_STEPS;
}

export function aadhaarStepIndex(role) {
  return role === 'user'
    ? CUSTOMER_FLOW_STEPS.length - 2
    : ARTIST_FLOW_STEPS.length - 3;
}

export function selfieStepIndex(role) {
  return role === 'user'
    ? CUSTOMER_FLOW_STEPS.length - 1
    : ARTIST_FLOW_STEPS.length - 2;
}

export function bankStepIndex() {
  return ARTIST_FLOW_STEPS.length - 1;
}

export function uploadedPaths(paths = []) {
  return paths.filter(
    path =>
      path &&
      !String(path).startsWith('file:') &&
      !String(path).startsWith('ph:') &&
      !String(path).startsWith('content:'),
  );
}

export function isArtistFormStep(stepId) {
  return Object.prototype.hasOwnProperty.call(ARTIST_STEP_INDEX, stepId);
}

export function screenForOnboardingStep(stepId, role) {
  if (!stepId || stepId === 'role' || !role) return 'RoleSelection';
  if (stepId === 'digilocker') return 'DigilockerInstructions';
  if (stepId === 'selfie') return 'VerifySelfie';
  if (stepId === 'bank') return 'BankDetails';
  if (stepId === 'complete') return 'OnboardingStatus';
  if (role === 'artist') return 'ArtistOnboard';
  if (role === 'user') return 'CustomerOnboard';
  return 'RoleSelection';
}

export function resumeArtistStepIndex(currentStep, editStep) {
  if (typeof editStep === 'number') {
    return editStep;
  }
  if (
    currentStep === 'complete' ||
    currentStep === 'pricing' ||
    currentStep === 'digilocker' ||
    currentStep === 'selfie' ||
    currentStep === 'bank'
  ) {
    return ARTIST_STEP_INDEX.pricing;
  }
  if (currentStep === 'role' || !currentStep) {
    return ARTIST_STEP_INDEX.profile;
  }
  return ARTIST_STEP_INDEX[currentStep] ?? 0;
}

export function resumeCustomerStepIndex(currentStep, editStep) {
  if (typeof editStep === 'number') {
    return editStep;
  }
  if (
    currentStep === 'complete' ||
    currentStep === 'location' ||
    currentStep === 'digilocker' ||
    currentStep === 'selfie'
  ) {
    return CUSTOMER_STEP_INDEX.location;
  }
  if (currentStep === 'role' || !currentStep) {
    return CUSTOMER_STEP_INDEX.name;
  }
  return CUSTOMER_STEP_INDEX[currentStep] ?? 0;
}

export function artistProgressPayload(form = {}, stepId) {
  const payload = {
    name: form.name,
    stageName: form.stageName,
    bio: form.bio,
    category: form.category,
    experience: form.experience,
    languages: form.languages,
    events: form.events,
    profilePhoto: form.profilePhoto || null,
    portfolioPhotos: uploadedPaths(form.portfolioPhotos),
    portfolioVideos: uploadedPaths(form.portfolioVideos),
    idImage: form.idImage || null,
    selfieImage: form.selfieImage || null,
    videoInterview: form.videoInterview || null,
  };
  if (!stepId || stepId === 'pricing') {
    payload.priceType = form.priceType || 'fixed';
    payload.price = form.priceType === 'fixed' ? toMoneyNumber(form.price) : 0;
    payload.travelAllowance = toMoneyNumber(form.travelAllowance);
    payload.trialSessionFee = toMoneyNumber(form.trialSessionFee);
    payload.teamMemberFee = toMoneyNumber(form.teamMemberFee);
  }
  return payload;
}
