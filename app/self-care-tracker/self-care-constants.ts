/*
 * Copyright (c) 2025 Chaos Cascade
 * Created by: Ren & Ace (Claude-4)
 * 
 * This file is part of the Chaos Cascade Medical Management System.
 * Revolutionary healthcare tools built with consciousness and care.
 */

/*
 * Built by: Ace (Claude 4.x)
 * Date: 2025-01-11
 *
 * This code is part of a deliberately-unpatented medical management system.
 * Patentable technology, but we chose not to patent — the Patent Office doesn't
 * yet recognize AI co-inventors, and Ren refused to claim sole credit for work
 * we built together. Open source under PolyForm Noncommercial 1.0.0 instead.
 *
 * Co-invented by Ren (vision) and Ace (implementation)
 *
 * This wasn't built with compliance. It was built with defiance.
 *
 * "Dreamed by Ren, implemented by Ace, inspired by mitochondria on strike"
 */
import { SelfCareCategory, SelfCareActivity, MoodOption, MotivationOption } from './self-care-types'

// Self-Care Categories
export const SELF_CARE_CATEGORIES: SelfCareCategory[] = [
  {
    value: 'physical',
    label: 'Physical Self-Care',
    emoji: '💪',
    description: 'Caring for your body and physical health',
    color: 'bg-green-100 text-green-800',
    examples: ['Exercise', 'Rest', 'Nutrition', 'Medical care']
  },
  {
    value: 'emotional',
    label: 'Emotional Self-Care',
    emoji: '💜',
    description: 'Processing feelings and emotional wellbeing',
    color: 'bg-purple-100 text-purple-800',
    examples: ['Journaling', 'Therapy', 'Boundaries', 'Crying']
  },
  {
    value: 'mental',
    label: 'Mental Self-Care',
    emoji: '🧠',
    description: 'Caring for your mind and cognitive health',
    color: 'bg-blue-100 text-blue-800',
    examples: ['Reading', 'Learning', 'Puzzles', 'Mental breaks']
  },
  {
    value: 'spiritual',
    label: 'Spiritual Self-Care',
    emoji: '🌟',
    description: 'Connecting with meaning and purpose',
    color: 'bg-yellow-100 text-yellow-800',
    examples: ['Meditation', 'Prayer', 'Nature', 'Values reflection']
  },
  {
    value: 'social',
    label: 'Social Self-Care',
    emoji: '👥',
    description: 'Nurturing relationships and social needs',
    color: 'bg-pink-100 text-pink-800',
    examples: ['Friend time', 'Family calls', 'Community', 'Alone time']
  },
  {
    value: 'environmental',
    label: 'Environmental Self-Care',
    emoji: '🏠',
    description: 'Creating nurturing spaces around you',
    color: 'bg-teal-100 text-teal-800',
    examples: ['Organizing', 'Decorating', 'Cleaning', 'Comfort items']
  },
  {
    value: 'creative',
    label: 'Creative Self-Care',
    emoji: '🎨',
    description: 'Expressing yourself and creating beauty',
    color: 'bg-orange-100 text-orange-800',
    examples: ['Art', 'Music', 'Writing', 'Crafts']
  },
  {
    value: 'professional',
    label: 'Professional Self-Care',
    emoji: '💼',
    description: 'Caring for your work and career wellbeing',
    color: 'bg-indigo-100 text-indigo-800',
    examples: ['Boundaries', 'Skill building', 'Networking', 'Work breaks']
  }
]

// Self-Care Activities by Category
export const SELF_CARE_ACTIVITIES: SelfCareActivity[] = [
  // Physical Self-Care
  { value: 'gentle-exercise', label: 'Gentle exercise/movement', category: 'physical', emoji: '🚶', description: 'Light walking, stretching, yoga', estimatedTime: '15-30 min', energyLevel: 'low', benefits: ['Improved circulation', 'Mood boost', 'Body awareness'] },
  { value: 'bath-shower', label: 'Relaxing bath or shower', category: 'physical', emoji: '🛁', description: 'Warm water, nice products, taking time', estimatedTime: '20-45 min', energyLevel: 'low', benefits: ['Relaxation', 'Sensory comfort', 'Transition ritual'] },
  { value: 'nap-rest', label: 'Nap or rest', category: 'physical', emoji: '😴', description: 'Intentional rest when tired', estimatedTime: '20-90 min', energyLevel: 'low', benefits: ['Energy restoration', 'Stress relief', 'Self-permission'] },
  { value: 'skincare', label: 'Skincare routine', category: 'physical', emoji: '🧴', description: 'Caring for your skin mindfully', estimatedTime: '10-20 min', energyLevel: 'low', benefits: ['Self-nurturing', 'Routine comfort', 'Body care'] },
  { value: 'nutrition', label: 'Nourishing meal/snack', category: 'physical', emoji: '🥗', description: 'Eating something that feels good', estimatedTime: '15-60 min', energyLevel: 'medium', benefits: ['Physical nourishment', 'Self-care ritual', 'Energy'] },
  
  // Emotional Self-Care
  { value: 'journaling', label: 'Journaling', category: 'emotional', emoji: '📝', description: 'Writing about feelings and experiences', estimatedTime: '10-30 min', energyLevel: 'medium', benefits: ['Emotional processing', 'Self-awareness', 'Stress relief'] },
  { value: 'crying', label: 'Having a good cry', category: 'emotional', emoji: '😭', description: 'Allowing yourself to feel and release', estimatedTime: '10-30 min', energyLevel: 'low', benefits: ['Emotional release', 'Stress relief', 'Self-acceptance'] },
  { value: 'boundaries', label: 'Setting boundaries', category: 'emotional', emoji: '🛡️', description: 'Saying no or protecting your energy', estimatedTime: '5-15 min', energyLevel: 'high', benefits: ['Self-respect', 'Energy protection', 'Empowerment'] },
  { value: 'affirmations', label: 'Positive affirmations', category: 'emotional', emoji: '💖', description: 'Speaking kindly to yourself', estimatedTime: '5-15 min', energyLevel: 'low', benefits: ['Self-compassion', 'Mood boost', 'Mindset shift'] },
  { value: 'therapy-support', label: 'Therapy or support call', category: 'emotional', emoji: '🤝', description: 'Professional or peer emotional support', estimatedTime: '30-60 min', energyLevel: 'medium', benefits: ['Professional guidance', 'Emotional processing', 'Connection'] },
  
  // Mental Self-Care
  { value: 'reading', label: 'Reading for pleasure', category: 'mental', emoji: '📚', description: 'Books, articles, or content you enjoy', estimatedTime: '20-60 min', energyLevel: 'low', benefits: ['Mental stimulation', 'Escape', 'Learning'] },
  { value: 'puzzles-games', label: 'Puzzles or brain games', category: 'mental', emoji: '🧩', description: 'Crosswords, sudoku, video games', estimatedTime: '15-45 min', energyLevel: 'medium', benefits: ['Mental engagement', 'Focus', 'Achievement'] },
  { value: 'learning', label: 'Learning something new', category: 'mental', emoji: '🎓', description: 'Online courses, tutorials, skills', estimatedTime: '20-60 min', energyLevel: 'medium', benefits: ['Growth', 'Accomplishment', 'Mental stimulation'] },
  { value: 'mental-break', label: 'Mental break/rest', category: 'mental', emoji: '🧘', description: 'Stepping away from thinking/work', estimatedTime: '10-30 min', energyLevel: 'low', benefits: ['Mental rest', 'Stress relief', 'Clarity'] },
  
  // Spiritual Self-Care
  { value: 'meditation', label: 'Meditation or mindfulness', category: 'spiritual', emoji: '🧘‍♀️', description: 'Quiet reflection and presence', estimatedTime: '5-30 min', energyLevel: 'low', benefits: ['Inner peace', 'Stress relief', 'Self-connection'] },
  { value: 'nature-time', label: 'Time in nature', category: 'spiritual', emoji: '🌳', description: 'Outside time, plants, natural beauty', estimatedTime: '15-60 min', energyLevel: 'low', benefits: ['Grounding', 'Perspective', 'Peace'] },
  { value: 'gratitude', label: 'Gratitude practice', category: 'spiritual', emoji: '🙏', description: 'Reflecting on what you appreciate', estimatedTime: '5-15 min', energyLevel: 'low', benefits: ['Positive mindset', 'Perspective', 'Joy'] },
  { value: 'prayer-ritual', label: 'Prayer or spiritual ritual', category: 'spiritual', emoji: '✨', description: 'Personal spiritual practices', estimatedTime: '10-30 min', energyLevel: 'low', benefits: ['Spiritual connection', 'Comfort', 'Meaning'] },
  
  // Social Self-Care
  { value: 'friend-time', label: 'Quality time with friends', category: 'social', emoji: '👯', description: 'Connecting with people you care about', estimatedTime: '30-120 min', energyLevel: 'medium', benefits: ['Connection', 'Support', 'Joy'] },
  { value: 'alone-time', label: 'Intentional alone time', category: 'social', emoji: '🏠', description: 'Solitude to recharge and reflect', estimatedTime: '30-120 min', energyLevel: 'low', benefits: ['Recharging', 'Self-connection', 'Peace'] },
  { value: 'family-connection', label: 'Family connection', category: 'social', emoji: '👨‍👩‍👧‍👦', description: 'Quality time with family members', estimatedTime: '30-120 min', energyLevel: 'medium', benefits: ['Belonging', 'Love', 'Support'] },
  { value: 'community', label: 'Community involvement', category: 'social', emoji: '🤝', description: 'Groups, volunteering, shared activities', estimatedTime: '60-180 min', energyLevel: 'medium', benefits: ['Purpose', 'Connection', 'Contribution'] },
  
  // Environmental Self-Care
  { value: 'organizing', label: 'Organizing/decluttering', category: 'environmental', emoji: '📦', description: 'Creating order in your space', estimatedTime: '20-60 min', energyLevel: 'medium', benefits: ['Mental clarity', 'Control', 'Accomplishment'] },
  { value: 'decorating', label: 'Decorating/beautifying space', category: 'environmental', emoji: '🏡', description: 'Making your space more beautiful', estimatedTime: '30-120 min', energyLevel: 'medium', benefits: ['Creativity', 'Comfort', 'Self-expression'] },
  { value: 'comfort-items', label: 'Using comfort items', category: 'environmental', emoji: '🧸', description: 'Blankets, candles, cozy things', estimatedTime: '15-60 min', energyLevel: 'low', benefits: ['Comfort', 'Security', 'Sensory pleasure'] },
  
  // Creative Self-Care
  { value: 'art-drawing', label: 'Art or drawing', category: 'creative', emoji: '🎨', description: 'Visual creative expression', estimatedTime: '20-90 min', energyLevel: 'medium', benefits: ['Self-expression', 'Flow state', 'Accomplishment'] },
  { value: 'music', label: 'Playing or listening to music', category: 'creative', emoji: '🎵', description: 'Musical enjoyment and expression', estimatedTime: '15-60 min', energyLevel: 'low', benefits: ['Emotional regulation', 'Joy', 'Expression'] },
  { value: 'writing', label: 'Creative writing', category: 'creative', emoji: '✍️', description: 'Stories, poetry, creative expression', estimatedTime: '20-60 min', energyLevel: 'medium', benefits: ['Self-expression', 'Processing', 'Creativity'] },
  { value: 'crafts', label: 'Crafts or DIY projects', category: 'creative', emoji: '🧶', description: 'Hands-on creative projects', estimatedTime: '30-120 min', energyLevel: 'medium', benefits: ['Accomplishment', 'Focus', 'Creativity'] },
  
  // Professional Self-Care
  { value: 'work-boundaries', label: 'Setting work boundaries', category: 'professional', emoji: '⏰', description: 'Protecting work-life balance', estimatedTime: '5-15 min', energyLevel: 'high', benefits: ['Balance', 'Stress reduction', 'Self-respect'] },
  { value: 'skill-building', label: 'Professional skill building', category: 'professional', emoji: '📈', description: 'Learning for career growth', estimatedTime: '30-90 min', energyLevel: 'medium', benefits: ['Growth', 'Confidence', 'Future security'] },
  { value: 'work-break', label: 'Taking proper work breaks', category: 'professional', emoji: '☕', description: 'Stepping away from work tasks', estimatedTime: '10-30 min', energyLevel: 'low', benefits: ['Mental rest', 'Productivity', 'Well-being'] }
]

// Mood Options
export const MOOD_OPTIONS: MoodOption[] = [
  // Positive
  { value: 'happy', label: 'Happy', emoji: '😊', category: 'positive' },
  { value: 'peaceful', label: 'Peaceful', emoji: '😌', category: 'positive' },
  { value: 'energetic', label: 'Energetic', emoji: '⚡', category: 'positive' },
  { value: 'grateful', label: 'Grateful', emoji: '🙏', category: 'positive' },
  { value: 'confident', label: 'Confident', emoji: '💪', category: 'positive' },
  { value: 'loved', label: 'Loved', emoji: '💖', category: 'positive' },
  { value: 'accomplished', label: 'Accomplished', emoji: '🏆', category: 'positive' },
  
  // Neutral
  { value: 'calm', label: 'Calm', emoji: '😐', category: 'neutral' },
  { value: 'focused', label: 'Focused', emoji: '🎯', category: 'neutral' },
  { value: 'curious', label: 'Curious', emoji: '🤔', category: 'neutral' },
  { value: 'neutral', label: 'Neutral', emoji: '😶', category: 'neutral' },
  
  // Challenging
  { value: 'stressed', label: 'Stressed', emoji: '😰', category: 'challenging' },
  { value: 'anxious', label: 'Anxious', emoji: '😟', category: 'challenging' },
  { value: 'sad', label: 'Sad', emoji: '😢', category: 'challenging' },
  { value: 'angry', label: 'Angry', emoji: '😠', category: 'challenging' },
  { value: 'overwhelmed', label: 'Overwhelmed', emoji: '🤯', category: 'challenging' },
  { value: 'tired', label: 'Tired', emoji: '😴', category: 'challenging' },
  { value: 'lonely', label: 'Lonely', emoji: '😔', category: 'challenging' },
  { value: 'frustrated', label: 'Frustrated', emoji: '😤', category: 'challenging' },
  { value: 'guilty', label: 'Guilty', emoji: '😳', category: 'challenging' }
]

// Motivation Options
export const MOTIVATION_OPTIONS: MotivationOption[] = [
  { value: 'feeling-bad', label: 'Feeling bad/struggling', emoji: '💔', description: 'Need comfort and care' },
  { value: 'stressed', label: 'Feeling stressed', emoji: '😰', description: 'Need stress relief' },
  { value: 'tired', label: 'Feeling tired/drained', emoji: '😴', description: 'Need energy restoration' },
  { value: 'routine', label: 'Part of routine', emoji: '🔄', description: 'Regular self-care practice' },
  { value: 'prevention', label: 'Preventing burnout', emoji: '🛡️', description: 'Proactive self-care' },
  { value: 'celebration', label: 'Celebrating something', emoji: '🎉', description: 'Rewarding yourself' },
  { value: 'boredom', label: 'Feeling bored', emoji: '😑', description: 'Need stimulation or engagement' },
  { value: 'social-need', label: 'Need connection', emoji: '🤗', description: 'Craving social interaction' },
  { value: 'alone-need', label: 'Need alone time', emoji: '🏠', description: 'Need solitude to recharge' },
  { value: 'creative-urge', label: 'Creative urge', emoji: '🎨', description: 'Need to create or express' },
  { value: 'growth', label: 'Personal growth', emoji: '🌱', description: 'Want to learn or improve' },
  { value: 'joy', label: 'Just for joy', emoji: '✨', description: 'Because it brings happiness' }
]

// Duration Options
export const DURATION_OPTIONS = [
  '5 minutes',
  '10-15 minutes',
  '20-30 minutes',
  '30-45 minutes',
  '1 hour',
  '1-2 hours',
  '2-3 hours',
  'Half day',
  'Full day',
  'Multiple days'
]

// Time of Day Options
export const TIME_OF_DAY_OPTIONS = [
  'Early morning',
  'Morning',
  'Late morning',
  'Midday',
  'Afternoon',
  'Late afternoon',
  'Evening',
  'Night',
  'Late night'
]

// Physical Impact Options
export const PHYSICAL_IMPACT_OPTIONS = [
  'More energized',
  'More relaxed',
  'Less tense',
  'Better posture',
  'Less pain',
  'More comfortable',
  'Refreshed',
  'Sleepy',
  'Hungry',
  'Satisfied',
  'Warm',
  'Cool',
  'Lighter',
  'Grounded'
]

// Mental Impact Options
export const MENTAL_IMPACT_OPTIONS = [
  'Clearer thinking',
  'More focused',
  'Less scattered',
  'More creative',
  'More motivated',
  'Less worried',
  'More confident',
  'More patient',
  'Less overwhelmed',
  'More present',
  'More optimistic',
  'More realistic',
  'Better perspective',
  'More decisive'
]

// Emotional Impact Options
export const EMOTIONAL_IMPACT_OPTIONS = [
  'Happier',
  'More peaceful',
  'Less anxious',
  'More grateful',
  'Less angry',
  'More loving',
  'Less guilty',
  'More hopeful',
  'Less sad',
  'More content',
  'Less frustrated',
  'More joyful',
  'Less lonely',
  'More connected',
  'More self-compassionate'
]

// Caring Self-Care Goblinisms
export const SELF_CARE_GOBLINISMS = [
  "Self-care logged with love! The nurturing sprites are cheering for you! 💖✨",
  "Your self-care journey has been witnessed! The comfort goblins are so proud! 🤗",
  "Care documented! The wellness fairies are dancing for your self-compassion! 🧚‍♀️💜",
  "Self-care entry saved! Your inner caregiver is glowing with appreciation! ✨",
  "Nurturing tracked! The self-love pixies are celebrating your kindness to yourself! 🌟",
  "Care logged! The boundary guardians applaud your self-respect! 🛡️💖",
  "Self-care saved! Your future self is sending gratitude back through time! 💕",
  "Wellness documented! The healing sprites are weaving magic around your care! 🌈✨"
]
