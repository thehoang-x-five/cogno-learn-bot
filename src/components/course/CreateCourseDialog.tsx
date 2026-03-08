import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useLanguage } from '@/contexts/LanguageContext';
import { useToast } from '@/hooks/use-toast';
import { Course } from '@/types';

interface CreateCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCourseCreated?: (course: Course) => void;
}

export default function CreateCourseDialog({ open, onOpenChange, onCourseCreated }: CreateCourseDialogProps) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [semester, setSemester] = useState('HK1-2026');
  const [isActive, setIsActive] = useState(true);

  const handleCreate = () => {
    if (!code || !name) {
      toast({ 
        title: t('users.missingInfo'), 
        description: t('users.fillRequired'),
        variant: 'destructive' 
      });
      return;
    }

    const newCourse: Course = {
      id: Date.now().toString(),
      code,
      name,
      description,
      semester,
      isActive,
      createdAt: new Date().toISOString(),
      teacherCount: 1,
      studentCount: 0,
      documentCount: 0,
    };

    onCourseCreated?.(newCourse);
    toast({ 
      title: t('toast.created'), 
      description: `${t('courses.name')} "${name}" ${t('toast.addedToSystem')}.` 
    });
    
    onOpenChange(false);
    setCode(''); 
    setName(''); 
    setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{t('courses.createTitle')}</DialogTitle>
          <DialogDescription>{t('courses.createDesc')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">{t('courses.code')}</Label>
              <Input id="code" placeholder="VD: CS102" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">{t('courses.semester')}</Label>
              <Select value={semester} onValueChange={setSemester}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="HK1-2026">HK1-2026</SelectItem>
                  <SelectItem value="HK2-2025">HK2-2025</SelectItem>
                  <SelectItem value="HK1-2025">HK1-2025</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">{t('courses.name')}</Label>
            <Input id="name" placeholder="VD: Mạng máy tính" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">{t('courses.description')}</Label>
            <Textarea id="desc" placeholder={t('courses.description') + '...'} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>{t('courses.status')}</Label>
              <p className="text-sm text-muted-foreground">{t('courses.statusDesc')}</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('action.cancel')}</Button>
          <Button onClick={handleCreate}>{t('courses.createButton')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
