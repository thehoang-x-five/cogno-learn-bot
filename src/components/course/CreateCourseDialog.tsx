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

interface CreateCourseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function CreateCourseDialog({ open, onOpenChange }: CreateCourseDialogProps) {
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [semester, setSemester] = useState('HK1-2026');
  const [isActive, setIsActive] = useState(true);

  const handleCreate = () => {
    console.log('Creating course:', { code, name, description, semester, isActive });
    onOpenChange(false);
    setCode(''); setName(''); setDescription('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Tạo môn học mới</DialogTitle>
          <DialogDescription>Thêm môn học mới vào hệ thống</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">Mã môn học</Label>
              <Input id="code" placeholder="VD: CS102" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="semester">Học kỳ</Label>
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
            <Label htmlFor="name">Tên môn học</Label>
            <Input id="name" placeholder="VD: Mạng máy tính" value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">Mô tả</Label>
            <Textarea id="desc" placeholder="Mô tả ngắn về môn học..." value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <Label>Trạng thái</Label>
              <p className="text-sm text-muted-foreground">Mở cho sinh viên đăng ký</p>
            </div>
            <Switch checked={isActive} onCheckedChange={setIsActive} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Hủy</Button>
          <Button onClick={handleCreate}>Tạo môn học</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
