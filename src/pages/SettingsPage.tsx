import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
  Settings, Bot, Database, Shield, Bell, Palette, Save, RotateCcw, Zap, Server,
  Key, Globe, Mail, CheckCircle2, AlertCircle, Sun, Moon,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const llmProviders = [
  { id: 'openai', name: 'OpenAI', models: ['gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'] },
  { id: 'google', name: 'Google AI', models: ['gemini-1.5-pro', 'gemini-1.5-flash'] },
  { id: 'ollama', name: 'Ollama (Local)', models: ['llama3', 'mistral', 'codellama'] },
];

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('general');
  
  const [siteName, setSiteName] = useState('EduAssist');
  const [siteDescription, setSiteDescription] = useState(t('settings.siteDescDefault'));
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  
  const [selectedProvider, setSelectedProvider] = useState('openai');
  const [selectedModel, setSelectedModel] = useState('gpt-4-turbo');
  const [apiKey, setApiKey] = useState('sk-***************************');
  const [temperature, setTemperature] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState('2000');
  
  const [chunkSize, setChunkSize] = useState('500');
  const [chunkOverlap, setChunkOverlap] = useState('50');
  const [topK, setTopK] = useState('5');
  const [embeddingModel, setEmbeddingModel] = useState('text-embedding-3-small');
  
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [quizReminders, setQuizReminders] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);

  const handleSave = () => {
    toast({ title: t('settings.saved'), description: t('settings.savedDesc') });
  };

  const handleReset = () => {
    toast({ title: t('settings.resetDone'), description: t('settings.resetDoneDesc'), variant: 'destructive' });
  };

  const currentProvider = llmProviders.find((p) => p.id === selectedProvider);

  const activityLogs = [
    { action: t('settings.logLogin'), user: 'admin@edu.vn', time: `5 ${t('settings.minutes')} ${t('settings.timeAgo')}` },
    { action: t('settings.logUpdateLLM'), user: 'admin@edu.vn', time: `1 ${t('settings.hours')} ${t('settings.timeAgo')}` },
    { action: t('settings.logAddUser'), user: 'admin@edu.vn', time: `2 ${t('settings.hours')} ${t('settings.timeAgo')}` },
    { action: t('settings.logDeleteDoc'), user: 'admin@edu.vn', time: `1 ${t('settings.dayAgo')}` },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 page-enter">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('settings.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('settings.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2">
            <RotateCcw className="h-4 w-4" />
            {t('action.reset')}
          </Button>
          <Button onClick={handleSave} className="gap-2">
            <Save className="h-4 w-4" />
            {t('action.save')}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6 lg:w-auto lg:inline-grid">
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.general')}</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="gap-2">
            <Palette className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.appearance')}</span>
          </TabsTrigger>
          <TabsTrigger value="llm" className="gap-2">
            <Bot className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.llm')}</span>
          </TabsTrigger>
          <TabsTrigger value="rag" className="gap-2">
            <Database className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.rag')}</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.notifications')}</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            <span className="hidden sm:inline">{t('settings.security')}</span>
          </TabsTrigger>
        </TabsList>

        {/* Appearance Settings */}
        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5" />
                {t('settings.theme')}
              </CardTitle>
              <CardDescription>{t('settings.themeChoose')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    theme === 'light' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-warning/10 flex items-center justify-center">
                      <Sun className="h-5 w-5 text-warning" />
                    </div>
                    <div>
                      <p className="font-semibold">{t('settings.themeLight')}</p>
                      <p className="text-xs text-muted-foreground">{t('settings.themeLightDesc')}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-background p-2 space-y-1.5">
                    <div className="h-2 w-16 rounded bg-foreground/20" />
                    <div className="h-2 w-24 rounded bg-foreground/10" />
                    <div className="h-2 w-20 rounded bg-primary/30" />
                  </div>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`p-6 rounded-xl border-2 transition-all text-left ${
                    theme === 'dark' ? 'border-primary bg-primary/5 shadow-md' : 'border-border hover:border-primary/30'
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Moon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">{t('settings.themeDark')}</p>
                      <p className="text-xs text-muted-foreground">{t('settings.themeDarkDesc')}</p>
                    </div>
                  </div>
                  <div className="rounded-lg border bg-sidebar p-2 space-y-1.5">
                    <div className="h-2 w-16 rounded bg-sidebar-foreground/20" />
                    <div className="h-2 w-24 rounded bg-sidebar-foreground/10" />
                    <div className="h-2 w-20 rounded bg-primary/30" />
                  </div>
                </button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t('settings.language')}
              </CardTitle>
              <CardDescription>{t('settings.langChoose')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  onClick={() => setLanguage('vi')}
                  className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    language === 'vi' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  }`}
                >
                  <span className="text-2xl">🇻🇳</span>
                  <div className="text-left">
                    <p className="font-semibold">Tiếng Việt</p>
                    <p className="text-xs text-muted-foreground">Vietnamese</p>
                  </div>
                  {language === 'vi' && <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />}
                </button>
                <button
                  onClick={() => setLanguage('en')}
                  className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 ${
                    language === 'en' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/30'
                  }`}
                >
                  <span className="text-2xl">🇺🇸</span>
                  <div className="text-left">
                    <p className="font-semibold">English</p>
                    <p className="text-xs text-muted-foreground">Tiếng Anh</p>
                  </div>
                  {language === 'en' && <CheckCircle2 className="h-5 w-5 text-primary ml-auto" />}
                </button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {t('settings.systemInfo')}
              </CardTitle>
              <CardDescription>{t('settings.systemInfoDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="siteName">{t('settings.siteName')}</Label>
                  <Input id="siteName" value={siteName} onChange={(e) => setSiteName(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteDescription">{t('settings.siteDescription')}</Label>
                  <Input id="siteDescription" value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                {t('settings.systemStatus')}
              </CardTitle>
              <CardDescription>{t('settings.systemStatusDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.maintenanceMode')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.maintenanceDesc')}</p>
                </div>
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} />
              </div>
              <Separator />
              <div className="grid gap-4 md:grid-cols-3">
                {['Database', 'Vector DB', 'LLM API'].map((name) => (
                  <div key={name} className="flex items-center gap-3 p-3 rounded-lg bg-success/10">
                    <CheckCircle2 className="h-5 w-5 text-success" />
                    <div>
                      <p className="font-medium">{name}</p>
                      <p className="text-sm text-muted-foreground">{t('settings.running')}</p>
                    </div>
                  </div>
                ))}
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
                {t('settings.llmConfig')}
              </CardTitle>
              <CardDescription>{t('settings.llmConfigDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>{t('settings.provider')}</Label>
                  <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {llmProviders.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>{provider.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.model')}</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {currentProvider?.models.map((model) => (
                        <SelectItem key={model} value={model}>{model}</SelectItem>
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
                <Input id="apiKey" type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} />
                <p className="text-xs text-muted-foreground">{t('settings.apiKeySecure')}</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="temperature">{t('settings.temperature')}</Label>
                  <Input id="temperature" type="number" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
                  <p className="text-xs text-muted-foreground">{t('settings.temperatureDesc')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">{t('settings.maxTokens')}</Label>
                  <Input id="maxTokens" type="number" min="100" max="8000" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} />
                  <p className="text-xs text-muted-foreground">{t('settings.maxTokensDesc')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                {t('settings.systemPrompt')}
              </CardTitle>
              <CardDescription>{t('settings.systemPromptDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                className="min-h-32"
                placeholder={t('settings.systemPromptPlaceholder')}
                defaultValue={t('settings.systemPromptDefault')}
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
                {t('settings.ragConfig')}
              </CardTitle>
              <CardDescription>{t('settings.ragConfigDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="chunkSize">Chunk Size (tokens)</Label>
                  <Input id="chunkSize" type="number" value={chunkSize} onChange={(e) => setChunkSize(e.target.value)} />
                  <p className="text-xs text-muted-foreground">{t('settings.chunkSizeDesc')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="chunkOverlap">Chunk Overlap (tokens)</Label>
                  <Input id="chunkOverlap" type="number" value={chunkOverlap} onChange={(e) => setChunkOverlap(e.target.value)} />
                  <p className="text-xs text-muted-foreground">{t('settings.chunkOverlapDesc')}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Embedding Model</Label>
                  <Select value={embeddingModel} onValueChange={setEmbeddingModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text-embedding-3-small">text-embedding-3-small</SelectItem>
                      <SelectItem value="text-embedding-3-large">text-embedding-3-large</SelectItem>
                      <SelectItem value="text-embedding-ada-002">text-embedding-ada-002</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topK">Top K Results</Label>
                  <Input id="topK" type="number" min="1" max="20" value={topK} onChange={(e) => setTopK(e.target.value)} />
                  <p className="text-xs text-muted-foreground">{t('settings.topKDesc')}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.vectorStats')}</CardTitle>
              <CardDescription>{t('settings.vectorStatsDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-4">
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">145</p>
                  <p className="text-sm text-muted-foreground">{t('settings.totalChunks')}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">6</p>
                  <p className="text-sm text-muted-foreground">{t('settings.documents')}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">1536</p>
                  <p className="text-sm text-muted-foreground">{t('settings.dimension')}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">2.3 MB</p>
                  <p className="text-sm text-muted-foreground">{t('settings.storage')}</p>
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
                {t('settings.emailNotif')}
              </CardTitle>
              <CardDescription>{t('settings.emailNotifConfig')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.emailNotifLabel')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.emailNotifDesc')}</p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.quizReminder')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.quizReminderDesc')}</p>
                </div>
                <Switch checked={quizReminders} onCheckedChange={setQuizReminders} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.systemAlerts')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.systemAlertsDesc')}</p>
                </div>
                <Switch checked={systemAlerts} onCheckedChange={setSystemAlerts} />
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
                {t('settings.securitySettings')}
              </CardTitle>
              <CardDescription>{t('settings.securityDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.2fa')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.2faDesc')}</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.loginLimit')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.loginLimitDesc')}</p>
                </div>
                <Switch defaultChecked />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.sessionTimeout')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.sessionTimeoutDesc')}</p>
                </div>
                <Select defaultValue="30">
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15 {t('settings.minutes')}</SelectItem>
                    <SelectItem value="30">30 {t('settings.minutes')}</SelectItem>
                    <SelectItem value="60">60 {t('settings.minutes')}</SelectItem>
                    <SelectItem value="120">2 {t('settings.hours')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t('settings.activityLog')}</CardTitle>
              <CardDescription>{t('settings.activityLogDesc')}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activityLogs.map((log, index) => (
                  <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
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
