import { Container } from '@/components/layout/Container';
import { StudyGroupList } from '@/components/study-groups/StudyGroupList';
import { StudyGroupForm } from '@/components/study-groups/StudyGroupForm';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

export default function StudyGroupsPage() {
  return (
    <Container className="py-8">
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Study Groups</h1>
            <p className="text-muted-foreground mt-2">
              Join or create study groups to learn together
            </p>
          </div>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Create Group
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Study Group</DialogTitle>
              </DialogHeader>
              <StudyGroupForm />
            </DialogContent>
          </Dialog>
        </div>

        <StudyGroupList />
      </div>
    </Container>
  );
}