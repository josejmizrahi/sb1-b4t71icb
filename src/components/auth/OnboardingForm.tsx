import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Progress } from '../ui/progress';
import { useToast } from '../ui/use-toast';
import { supabase } from '@/lib/supabase';
import { usePoints } from '@/hooks/usePoints';

interface OnboardingStep {
  title: string;
  description: string;
}

const STEPS: OnboardingStep[] = [
  {
    title: 'Personal Information',
    description: 'Tell us about yourself'
  },
  {
    title: 'Profile Details',
    description: 'Customize your profile'
  },
  {
    title: 'Interests',
    description: 'Help us personalize your experience'
  }
];

export function OnboardingForm() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { awardPointsForAction } = usePoints();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    displayName: '',
    bio: '',
    location: '',
    interests: '',
    skills: ''
  });

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const handleSubmit = async () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('No user found');

      const { error } = await supabase
        .from('profiles')
        .update({
          display_name: formData.displayName,
          bio: formData.bio,
          location: formData.location,
          interests: formData.interests.split(',').map(i => i.trim()),
          skills: formData.skills.split(',').map(s => s.trim())
        })
        .eq('id', user.id);

      if (error) throw error;

      await awardPointsForAction('COMPLETE_PROFILE');

      toast({
        title: "Profile completed!",
        description: "Welcome to the community",
      });

      navigate('/');
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : 'Failed to update profile',
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Display Name</label>
              <Input
                value={formData.displayName}
                onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                placeholder="How should we call you?"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Location</label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Where are you based?"
                required
              />
            </div>
          </div>
        );
      case 1:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Bio</label>
              <Textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                placeholder="Tell us about yourself..."
                required
              />
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Interests</label>
              <Input
                value={formData.interests}
                onChange={(e) => setFormData({ ...formData, interests: e.target.value })}
                placeholder="Torah study, Jewish history, etc. (comma-separated)"
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Skills</label>
              <Input
                value={formData.skills}
                onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                placeholder="Teaching, organizing events, etc. (comma-separated)"
                required
              />
            </div>
          </div>
        );
    }
  };

  return (
    <div className="max-w-md mx-auto p-6 space-y-8">
      <div>
        <h2 className="text-2xl font-bold">{STEPS[currentStep].title}</h2>
        <p className="text-muted-foreground mt-2">
          {STEPS[currentStep].description}
        </p>
      </div>

      <div className="space-y-2">
        <Progress value={progress} />
        <p className="text-sm text-muted-foreground text-center">
          Step {currentStep + 1} of {STEPS.length}
        </p>
      </div>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
        {renderStep()}

        <div className="flex justify-between">
          {currentStep > 0 && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setCurrentStep(currentStep - 1)}
            >
              Previous
            </Button>
          )}
          <Button
            type="submit"
            className={currentStep === 0 ? 'w-full' : ''}
            disabled={loading}
          >
            {currentStep === STEPS.length - 1
              ? loading ? 'Completing...' : 'Complete Profile'
              : 'Next'
            }
          </Button>
        </div>
      </form>
    </div>
  );
}