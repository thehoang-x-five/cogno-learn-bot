import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Settings,
  Bot,
  Database,
  Shield,
  Bell,
  Palette,
  Save,
  RotateCcw,
  Zap,
  Server,
  Key,
  Globe,
  Mail,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const llmProviders = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'] },
  { id: 'google', name: 'Google AI', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
  { id: 'ollama', name: 'Ollama (Local)', models: ['llama3', 'mistral', 'codellama'] },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('general');
  
  // General settings
  const [siteName, setSiteName] = useState('EduAssist');
  const [siteDescription, setSiteDescription] = useState('Hệ thống Trợ lý Học tập AI');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
  // LLM settings
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4-turbo');
  const [apiKey, setApiKey] = useState('sk-***************************');
  const [temperature, setTemperature] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState('2000');
  
  // RAG settings
  const [chunkSize, setChunkSize] = useState('500');
  const [chunkOverlap, setChunkOverlap] = useState('50');
  const [topK, setTopK] = useState('5');
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-3-small');
  
  // Notification settings
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [quizReminders, setQuizReminders] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);

  const handleSave = () => {
    toast({
      title: 'Đã lưu cài đặt',
      description: 'Các thay đổi đã được áp dụng thành công.',
    });
  };

  const handleReset = () => {
    toast({
      title: 'Đã khôi phục mặc định',
      description: 'Cài đặt đã được đặt lại về giá trị mặc định.',
      variant: 'destructive',
    });
  };

  const currentProvider = llmProviders.find((p) => p.id === selectedProvider);

  return (
    <div className="p-6 lg:p-8 space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cài đặt hệ thống</h1>
          <p className="text-muted-foreground mt-1">
            Cấu hình và tùy chỉnh hệ thống EduAssist
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            Khôi phục mặc định
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            Lưu thay đổi
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5 lg:w-auto lg:inline-grid">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">Chung</span>
          </TabsTrigger>
          <TabsTrigger value="llm" className="gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">LLM</span>
          </TabsTrigger>
          <TabsTrigger value="rag" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">RAG</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">Thông báo</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">Bảo mật</span>
          </TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Thông tin hệ thống
              </CardTitle>
              <CardDescription>
                Cấu hình thông tin cơ bản của hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="siteName">Tên hệ thống</Label>
                  <Input
                    id="siteName"
                    value={siteName}
                    onChange={(e) => setSiteName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteDescription">Mô tả</Label>
                  <Input
                    id="siteDescription"
                    value={siteDescription}
                    onChange={(e) => setSiteDescription(e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Trạng thái hệ thống
              </CardTitle>
              <CardDescription>
                Quản lý trạng thái hoạt động của hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Chế độ bảo trì</Label>
                  <p className="text-sm text-muted-foreground">
                    Tạm ngưng truy cập hệ thống để bảo trì
                  </p>
                </div>
                <Switch
                  checked={maintenanceMode}
                  onCheckedChange={setMaintenanceMode}
                />
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-3">
                <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium">Database</p>
                    <p className="text-sm text-muted-foreground">Hoạt động</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium">Vector DB</p>
                    <p className="text-sm text-muted-foreground">Hoạt động</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-lg bg-success/10">
                  <CheckCircle2 className="h-5 w-5 text-success" />
                  <div>
                    <p className="font-medium">LLM API</p>
                    <p className="text-sm text-muted-foreground">Hoạt động</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* LLM Settings */}
        <TabsContent value="llm" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bot className="h-5 w-5" />
                Cấu hình LLM
              </CardTitle>
              <CardDescription>
                Chọn và cấu hình mô hình ngôn ngữ lớn
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Nhà cung cấp</Label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {llmProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Model</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {currentProvider?.models.map((model) => (
                        <SelectItem key={model} value={model}>
                          {model}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <Label htmlFor="apiKey" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  API Key
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  API key được mã hóa và lưu trữ an toàn
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="temperature">Temperature</Label>
                  <Input
                    id="temperature"
                    type="number"
                    min="0"
                    max="2"
                    step="0.1"
                    value={temperature}
                    onChange={(e) => setTemperature(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Độ sáng tạo của câu trả lời (0-2)
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">Max Tokens</Label>
                  <Input
                    id="maxTokens"
                    type="number"
                    min="100"
                    max="8000"
                    value={maxTokens}
                    onChange={(e) => setMaxTokens(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Độ dài tối đa của câu trả lời
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                System Prompt
              </CardTitle>
              <CardDescription>
                Cấu hình prompt hệ thống cho chatbot
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                className="min-h-32"
                placeholder="Bạn là trợ giảng AI thông minh..."
                defaultValue="Bạn là trợ giảng AI thông minh của hệ thống EduAssist. Nhiệm vụ của bạn là hỗ trợ sinh viên học tập dựa trên tài liệu môn học đã được cung cấp. Trả lời chính xác, dễ hiểu và luôn trích dẫn nguồn từ tài liệu khi có thể."
              />
            </CardContent>
          </Card>
        </TabsContent>

        {/* RAG Settings */}
        <TabsContent value="rag" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                Cấu hình RAG Pipeline
              </CardTitle>
              <CardDescription>
                Tùy chỉnh quy trình xử lý tài liệu và tìm kiếm
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="chunkSize">Chunk Size (tokens)</Label>
                  <Input
                    id="chunkSize"
                    type="number"
                    value={chunkSize}
                    onChange={(e) => setChunkSize(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Kích thước mỗi đoạn văn bản khi chia nhỏ tài liệu
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chunkOverlap">Chunk Overlap (tokens)</Label>
                  <Input
                    id="chunkOverlap"
                    type="number"
                    value={chunkOverlap}
                    onChange={(e) => setChunkOverlap(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Độ chồng lấp giữa các chunks liền kề
                  </p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Embedding Model</Label>
                  <Select value={embeddingModel} onValueChange={setEmbeddingModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                      <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                      <SelectItem value="text-embedding-ada-002">text-embedding-ada-002</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topK">Top K Results</Label>
                  <Input
                    id="topK"
                    type="number"
                    min="1"
                    max="20"
                    value={topK}
                    onChange={(e) => setTopK(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    Số lượng chunks tối đa trả về khi tìm kiếm
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Thống kê Vector Database</CardTitle>
              <CardDescription>
                Thông tin về dữ liệu đã được index
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">145</p>
                  <p className="text-sm text-muted-foreground">Tổng chunks</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">6</p>
                  <p className="text-sm text-muted-foreground">Tài liệu</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">1536</p>
                  <p className="text-sm text-muted-foreground">Dimension</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">2.3 MB</p>
                  <p className="text-sm text-muted-foreground">Dung lượng</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Thông báo Email
              </CardTitle>
              <CardDescription>
                Cấu hình gửi thông báo qua email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Thông báo email</Label>
                  <p className="text-sm text-muted-foreground">
                    Gửi thông báo quan trọng qua email
                  </p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Nhắc nhở Quiz</Label>
                  <p className="text-sm text-muted-foreground">
                    Gửi email nhắc nhở khi có quiz mới
                  </p>
                </div>
                <Switch
                  checked={quizReminders}
                  onCheckedChange={setQuizReminders}
                />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Cảnh báo hệ thống</Label>
                  <p className="text-sm text-muted-foreground">
                    Thông báo khi có lỗi hoặc sự cố
                  </p>
                </div>
                <Switch
                  checked={systemAlerts}
                  onCheckedChange={setSystemAlerts}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Cài đặt bảo mật
              </CardTitle>
              <CardDescription>
                Cấu hình bảo mật và xác thực
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Xác thực 2 yếu tố (2FA)</Label>
                  <p className="text-sm text-muted-foreground">
                    Yêu cầu xác thực 2 bước cho admin
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Giới hạn đăng nhập sai</Label>
                  <p className="text-sm text-muted-foreground">
                    Khóa tài khoản sau 5 lần đăng nhập sai
                  </p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Session Timeout</Label>
                  <p className="text-sm text-muted-foreground">
                    Tự động đăng xuất sau 30 phút không hoạt động
                  </p>
                </div>
                <Select defaultValue="30">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 phút</SelectItem>
                    <SelectItem value="30">30 phút</SelectItem>
                    <SelectItem value="60">60 phút</SelectItem>
                    <SelectItem value="120">2 giờ</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nhật ký hoạt động</CardTitle>
              <CardDescription>
                Hoạt động gần đây của quản trị viên
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[
                  { action: 'Đăng nhập hệ thống', user: 'admin@edu.vn', time: '5 phút trước' },
                  { action: 'Cập nhật cấu hình LLM', user: 'admin@edu.vn', time: '1 giờ trước' },
                  { action: 'Thêm người dùng mới', user: 'admin@edu.vn', time: '2 giờ trước' },
                  { action: 'Xóa tài liệu', user: 'admin@edu.vn', time: '1 ngày trước' },
                ].map((log, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{log.action}</p>
                      <p className="text-sm text-muted-foreground">{log.user}</p>
                    </div>
                    <Badge variant="outline">{log.time}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
