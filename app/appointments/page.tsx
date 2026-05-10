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
/**
 * APPOINTMENTS TRACKER
 * 
 * Pre and post appointment planning with provider integration
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useDailyData } from '@/lib/database/hooks/use-daily-data';
import { CATEGORIES, SUBCATEGORIES } from '@/lib/database/dexie-db';
import AppCanvas from '@/components/app-canvas';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
  Calendar, 
  Plus, 
  FileText, 
  Clock, 
  User,
  Edit3,
  Trash2,
  Star,
  CheckCircle
} from 'lucide-react';

import AppointmentPlanner from '@/components/appointments/appointment-planner';
import AppointmentReview from '@/components/appointments/appointment-review';

interface AppointmentPlan {
  id: string;
  providerId: string;
  providerName: string;
  appointmentDate: string;
  appointmentTime: string;
  lastVisitNotes: string;
  newSymptoms: string;
  appointmentGoals: string;
  testsToDiscuss: string;
  medicationQuestions: string;
  questionsToAsk: string;
  importedFromTags: string[];
  addToCalendar: boolean;
  reminderEnabled: boolean;
  reminderDays: number;
  createdAt: string;
  updatedAt: string;
}

interface AppointmentReview {
  id: string;
  providerId: string;
  providerName: string;
  appointmentDate: string;
  wentWell: string;
  couldImprove: string;
  testsOrReferrals: string;
  doctorFeeling: string;
  diagnosisMedChanges: string;
  followUpNeeded: string;
  overallRating: number;
  createdAt: string;
  updatedAt: string;
}

export default function AppointmentsPage() {
  const [appointmentPlans, setAppointmentPlans] = useState<AppointmentPlan[]>([]);
  const [appointmentReviews, setAppointmentReviews] = useState<AppointmentReview[]>([]);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState<AppointmentPlan | null>(null);
  const [editingReview, setEditingReview] = useState<AppointmentReview | null>(null);

  const { saveData, getCategoryData, isLoading } = useDailyData();

  // Load data from storage
  useEffect(() => {
    const loadData = async () => {
      if (isLoading) return;

      try {
        // Load appointment plans - get all USER category records and filter for appointment plans
        const allUserRecords = await getCategoryData(new Date().toISOString().split('T')[0], CATEGORIES.USER);
        const plans: AppointmentPlan[] = [];
        const reviews: AppointmentReview[] = [];

        allUserRecords.forEach(record => {
          if (record.content) {
            try {
              // Check if this is an appointment plan
              if (record.subcategory.startsWith('appointment-plan-')) {
                const plan = JSON.parse(record.content);
                plans.push(plan);
              }
              // Check if this is an appointment review
              else if (record.subcategory.startsWith('appointment-review-')) {
                const review = JSON.parse(record.content);
                reviews.push(review);
              }
            } catch (error) {
              console.error('Failed to parse appointment record:', error);
            }
          }
        });

        setAppointmentPlans(plans);
        setAppointmentReviews(reviews);
      } catch (error) {
        console.error('Failed to load appointment data:', error);
      }
    };
    loadData();
  }, [getCategoryData, isLoading]);

  const handleSavePlan = async (plan: AppointmentPlan) => {
    try {
      // Save to Dexie using plan ID as subcategory
      await saveData(
        new Date().toISOString().split('T')[0],
        CATEGORIES.USER,
        `appointment-plan-${plan.id}`,
        JSON.stringify(plan)
      );

      // Refresh the data from storage to ensure consistency
      const allUserRecords = await getCategoryData(new Date().toISOString().split('T')[0], CATEGORIES.USER);
      const plans: AppointmentPlan[] = [];

      allUserRecords.forEach(record => {
        if (record.content && record.subcategory.startsWith('appointment-plan-')) {
          try {
            const planData = JSON.parse(record.content);
            plans.push(planData);
          } catch (error) {
            console.error('Failed to parse appointment plan:', error);
          }
        }
      });

      setAppointmentPlans(plans);
      setShowPlanDialog(false);
      setEditingPlan(null);
    } catch (error) {
      console.error('Failed to save appointment plan:', error);
      alert('Failed to save appointment plan: ' + error);
    }
  };

  const handleSaveReview = async (review: AppointmentReview) => {
    try {
      // Save to Dexie using review ID as subcategory
      await saveData(
        new Date().toISOString().split('T')[0],
        CATEGORIES.USER,
        `appointment-review-${review.id}`,
        JSON.stringify(review)
      );

      // Refresh the data from storage to ensure consistency
      const allUserRecords = await getCategoryData(new Date().toISOString().split('T')[0], CATEGORIES.USER);
      const reviews: AppointmentReview[] = [];

      allUserRecords.forEach(record => {
        if (record.content && record.subcategory.startsWith('appointment-review-')) {
          try {
            const reviewData = JSON.parse(record.content);
            reviews.push(reviewData);
          } catch (error) {
            console.error('Failed to parse appointment review:', error);
          }
        }
      });

      setAppointmentReviews(reviews);
      setShowReviewDialog(false);
      setEditingReview(null);
    } catch (error) {
      console.error('Failed to save appointment review:', error);
      alert('Failed to save appointment review: ' + error);
    }
  };

  const handleDeletePlan = async (id: string) => {
    try {
      // Delete from Dexie by setting content to empty
      await saveData(
        new Date().toISOString().split('T')[0],
        CATEGORIES.USER,
        `appointment-plan-${id}`,
        '' // Empty content effectively deletes the record
      );
      setAppointmentPlans(prev => prev.filter(p => p.id !== id));
    } catch (error) {
      console.error('Failed to delete appointment plan:', error);
      alert('Failed to delete appointment plan: ' + error);
    }
  };

  const handleDeleteReview = async (id: string) => {
    try {
      // Delete from Dexie by setting content to empty
      await saveData(
        new Date().toISOString().split('T')[0],
        CATEGORIES.USER,
        `appointment-review-${id}`,
        '' // Empty content effectively deletes the record
      );
      setAppointmentReviews(prev => prev.filter(r => r.id !== id));
    } catch (error) {
      console.error('Failed to delete appointment review:', error);
      alert('Failed to delete appointment review: ' + error);
    }
  };

  const handleEditPlan = (plan: AppointmentPlan) => {
    setEditingPlan(plan);
    setShowPlanDialog(true);
  };

  const handleEditReview = (review: AppointmentReview) => {
    setEditingReview(review);
    setShowReviewDialog(true);
  };

  const resetPlanForm = () => {
    setEditingPlan(null);
    setShowPlanDialog(false);
  };

  const resetReviewForm = () => {
    setEditingReview(null);
    setShowReviewDialog(false);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isUpcoming = (dateString: string) => {
    return new Date(dateString) >= new Date();
  };

  const upcomingPlans = appointmentPlans.filter(plan => isUpcoming(plan.appointmentDate));
  const pastPlans = appointmentPlans.filter(plan => !isUpcoming(plan.appointmentDate));

  return (
    <AppCanvas currentPage="appointments">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="text-center">
          <h1 className="text-3xl font-bold mb-2 flex items-center justify-center gap-2">
            <Calendar className="h-8 w-8 text-blue-500" />
            Appointments
          </h1>
          <p className="text-muted-foreground">
            Plan and review your healthcare appointments
          </p>
        </header>

        {/* Action Buttons */}
        <div className="flex justify-center gap-4">
          <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2" onClick={resetPlanForm}>
                <Plus className="h-4 w-4" />
                Plan Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingPlan ? 'Edit Appointment Plan' : 'Plan New Appointment'}
                </DialogTitle>
                <DialogDescription>
                  {editingPlan ? 'Update your appointment preparation' : 'Prepare for your upcoming appointment with smart data import'}
                </DialogDescription>
              </DialogHeader>
              <AppointmentPlanner 
                onSave={handleSavePlan}
                existingPlan={editingPlan || undefined}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2" onClick={resetReviewForm}>
                <FileText className="h-4 w-4" />
                Review Appointment
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingReview ? 'Edit Appointment Review' : 'Review Recent Appointment'}
                </DialogTitle>
                <DialogDescription>
                  {editingReview ? 'Update your appointment review' : 'Record details about your recent appointment'}
                </DialogDescription>
              </DialogHeader>
              <AppointmentReview 
                onSave={handleSaveReview}
                existingReview={editingReview || undefined}
              />
            </DialogContent>
          </Dialog>
        </div>

        <Tabs defaultValue="upcoming" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="upcoming">Upcoming Plans</TabsTrigger>
            <TabsTrigger value="past">Past Plans</TabsTrigger>
            <TabsTrigger value="reviews">Reviews</TabsTrigger>
          </TabsList>

          {/* Upcoming Appointments */}
          <TabsContent value="upcoming" className="space-y-4">
            {upcomingPlans.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No upcoming appointments planned</h3>
                <p className="text-muted-foreground mb-4">
                  Plan your next appointment to stay prepared
                </p>
                <Button onClick={() => setShowPlanDialog(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Plan Your First Appointment
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {upcomingPlans.map((plan) => (
                  <Card key={plan.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-semibold break-words">{plan.providerName}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(plan.appointmentDate)}
                            {plan.appointmentTime && (
                              <>
                                <Clock className="h-4 w-4 ml-2" />
                                {plan.appointmentTime}
                              </>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditPlan(plan)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePlan(plan.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {plan.importedFromTags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {plan.importedFromTags.slice(0, 3).map((tag) => (
                            <Badge key={tag} variant="secondary" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {plan.importedFromTags.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{plan.importedFromTags.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}

                      {plan.appointmentGoals && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          Goals: {plan.appointmentGoals}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Past Plans */}
          <TabsContent value="past" className="space-y-4">
            {pastPlans.length === 0 ? (
              <Card className="p-8 text-center">
                <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No past appointment plans</h3>
                <p className="text-muted-foreground">
                  Your completed appointment plans will appear here
                </p>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {pastPlans.map((plan) => (
                  <Card key={plan.id} className="p-4 opacity-75">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-semibold break-words">{plan.providerName}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(plan.appointmentDate)}
                            <CheckCircle className="h-4 w-4 text-green-500 ml-2" />
                          </div>
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeletePlan(plan.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Reviews */}
          <TabsContent value="reviews" className="space-y-4">
            {appointmentReviews.length === 0 ? (
              <Card className="p-8 text-center">
                <Star className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No appointment reviews yet</h3>
                <p className="text-muted-foreground mb-4">
                  Review your appointments to track your healthcare journey
                </p>
                <Button onClick={() => setShowReviewDialog(true)} className="gap-2">
                  <FileText className="h-4 w-4" />
                  Review Your First Appointment
                </Button>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {appointmentReviews.map((review) => (
                  <Card key={review.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0 pr-2">
                          <h3 className="font-semibold break-words">{review.providerName}</h3>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-4 w-4" />
                            {formatDate(review.appointmentDate)}
                          </div>
                          {review.overallRating > 0 && (
                            <div className="flex items-center gap-1 mt-1">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-3 w-3 ${
                                    i < review.overallRating 
                                      ? 'text-yellow-500 fill-current' 
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 flex-shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditReview(review)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit3 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteReview(review.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {review.wentWell && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {review.wentWell}
                        </p>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>

        <div className="text-center">
          <Button variant="outline" onClick={() => {
            // Check if we came from providers page
            const urlParams = new URLSearchParams(window.location.search);
            const fromProviders = urlParams.get('provider') || document.referrer.includes('/providers');
            if (fromProviders) {
              window.location.href = '/providers';
            } else {
              window.location.href = '/';
            }
          }}>
            ← Back to {new URLSearchParams(window.location.search).get('provider') || document.referrer.includes('/providers') ? 'Providers' : 'Command Center'}
          </Button>
        </div>
      </div>
    </AppCanvas>
  );
}
