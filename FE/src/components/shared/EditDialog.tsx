import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Save } from 'lucide-react';
import { useState } from 'react';
import { useLanguage } from '@/contexts/LanguageContext';

export interface EditField {
  key: string;
  label: string;
  value: string;
  type?: 'text' | 'textarea' | 'email';
  placeholder?: string;
  disabled?: boolean;
}

interface EditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  fields: EditField[];
  onSave: (values: Record<string, string>) => void | Promise<void>;
}

export default function EditDialog({
  open,
  onOpenChange,
  title,
  description,
  fields,
  onSave,
}: EditDialogProps) {
  const { t } = useLanguage();
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const values: Record<string, string> = {};
    fields.forEach((f) => {
      values[f.key] = (formData.get(f.key) as string) || '';
    });
    setIsSaving(true);
    try {
      await Promise.resolve(onSave(values));
      onOpenChange(false);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {fields.map((field) => (
            <div key={field.key} className="space-y-2">
              <Label htmlFor={field.key}>{field.label}</Label>
              {field.type === 'textarea' ? (
                <Textarea
                  id={field.key}
                  name={field.key}
                  defaultValue={field.value}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                  className="min-h-20"
                />
              ) : (
                <Input
                  id={field.key}
                  name={field.key}
                  type={field.type || 'text'}
                  defaultValue={field.value}
                  placeholder={field.placeholder}
                  disabled={field.disabled}
                />
              )}
            </div>
          ))}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              {t('action.cancel')}
            </Button>
            <Button type="submit" className="gap-2" disabled={isSaving}>
              <Save className="h-4 w-4" />
              {t('edit.saveChanges')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
