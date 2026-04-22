import { useEffect, useState, useCallback } from 'react';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Settings, Bot, Database, Shield, Bell, Palette, Save, RotateCcw, Zap, Server,
  Key, Globe, Mail, CheckCircle2, Sun, Moon, Loader2,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import * as settingsService from '@/services/settingsService';
import type { SystemSettings } from '@/services/settingsService';

/** Backend chỉ hỗ trợ Gemini; danh sách model khớp Google Generative Language API */
const GEMINI_MODELS = [
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro',
  'gemini-1.0-pro',
];

const EMBEDDING_MODELS = [
  'paraphrase-multilingual-MiniLM-L12-v2',
  'all-MiniLM-L6-v2',
  'paraphrase-multilingual-mpnet-base-v2',
];

const defaultPromptVi =
  'Bạn là trợ giảng AI thông minh của hệ thống EduAssist. Nhiệm vụ của bạn là hỗ trợ sinh viên học tập dựa trên tài liệu môn học đã được cung cấp.';

export default function SettingsPage() {
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { language, setLanguage, t } = useLanguage();
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [siteName, setSiteName] = useState('EduAssist');
  const [siteDescription, setSiteDescription] = useState(t('settings.siteDescDefault'));
  const [maintenanceMode, setMaintenanceMode] = useState(false);

  const [selectedModel, setSelectedModel] = useState('gemini-2.0-flash');
  const [apiKey, setApiKey] = useState('');
  const [apiKeyConfigured, setApiKeyConfigured] = useState(false);
  const [apiKeyLast4, setApiKeyLast4] = useState<string | null>(null);
  const [temperature, setTemperature] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState('2048');
  const [systemPrompt, setSystemPrompt] = useState('');
  const [systemPromptOverride, setSystemPromptOverride] = useState(false);

  const [chunkSize, setChunkSize] = useState('1024');
  const [chunkOverlap, setChunkOverlap] = useState('200');
  const [topK, setTopK] = useState('5');
  const [embeddingModel, setEmbeddingModel] = useState('paraphrase-multilingual-MiniLM-L12-v2');

  const [stats, setStats] = useState({ total_chunks: 0, total_documents: 0, embedding_dimension: 384 });

  const [emailNotifications, setEmailNotifications] = useState(true);
  const [quizReminders, setQuizReminders] = useState(true);
  const [systemAlerts, setSystemAlerts] = useState(true);

  const applyServerSettings = useCallback((s: SystemSettings) => {
    setSelectedModel(s.model);
    setTemperature(String(s.temperature));
    setMaxTokens(String(s.max_tokens));
    setSystemPrompt(s.system_prompt || '');
    setSystemPromptOverride(s.system_prompt_override);
    setApiKey('');
    setApiKeyConfigured(s.gemini_api_key_configured);
    setApiKeyLast4(s.gemini_api_key_last4);
    setChunkSize(String(s.chunk_size));
    setChunkOverlap(String(s.chunk_overlap));
    setTopK(String(s.top_k));
    setEmbeddingModel(s.embedding_model);
    setStats({
      total_chunks: s.total_chunks,
      total_documents: s.total_documents,
      embedding_dimension: s.embedding_dimension,
    });
  }, []);

  const loadSettings = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const s = await settingsService.getSettings();
      applyServerSettings(s);
    } catch (err) {
      setLoadError(settingsService.formatSettingsError(err));
    } finally {
      setLoading(false);
    }
  }, [applyServerSettings]);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  const buildPayload = (): settingsService.SystemSettingsUpdate => {
    const payload: settingsService.SystemSettingsUpdate = {
      provider: 'gemini',
      model: selectedModel,
      temperature: parseFloat(temperature) || 0.7,
      max_tokens: parseInt(maxTokens, 10) || 2048,
      system_prompt: systemPrompt,
      system_prompt_override: systemPromptOverride,
      chunk_size: parseInt(chunkSize, 10) || 1024,
      chunk_overlap: parseInt(chunkOverlap, 10) || 200,
      top_k: parseInt(topK, 10) || 5,
      embedding_model: embeddingModel,
    };
    const trimmed = apiKey.trim();
    if (trimmed && !trimmed.includes('***') && !trimmed.includes('************************')) {
      payload.gemini_api_key = trimmed;
    }
    return payload;
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await settingsService.updateSettings(buildPayload());
      applyServerSettings(updated);
      toast({ title: t('settings.saved'), description: t('settings.savedDesc') });
    } catch (err) {
      toast({
        variant: 'destructive',
        title: t('status.error'),
        description: settingsService.formatSettingsError(err),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    await loadSettings();
    toast({
      title: t('settings.resetDone'),
      description: t('settings.resetReloaded'),
    });
  };

  const activityLogs = [
    { action: t('settings.logLogin'), user: 'admin@edu.vn', time: `5 ${t('settings.minutes')} ${t('settings.timeAgo')}` },
    { action: t('settings.logUpdateLLM'), user: 'admin@edu.vn', time: `1 ${t('settings.hours')} ${t('settings.timeAgo')}` },
    { action: t('settings.logAddUser'), user: 'admin@edu.vn', time: `2 ${t('settings.hours')} ${t('settings.timeAgo')}` },
    { action: t('settings.logDeleteDoc'), user: 'admin@edu.vn', time: `1 ${t('settings.dayAgo')}` },
  ];

  const notConnected = (
    <Alert className="border-dashed">
      <AlertTitle>{t('settings.notConnectedTitle')}</AlertTitle>
      <AlertDescription>{t('settings.notConnectedDesc')}</AlertDescription>
    </Alert>
  );

  if (loading) {
    return (
      <div className="p-8 flex items-center justify-center gap-2 text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span>{t('settings.loading')}</span>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="p-6 max-w-lg mx-auto space-y-4">
        <Alert variant="destructive">
          <AlertTitle>{t('status.error')}</AlertTitle>
          <AlertDescription>{loadError}</AlertDescription>
        </Alert>
        <Button onClick={() => loadSettings()} variant="outline">{t('action.retry')}</Button>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 sm:space-y-6 page-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">{t('settings.title')}</h1>
          <p className="text-muted-foreground mt-1">{t('settings.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleReset} className="gap-2" disabled={saving}>
            <RotateCcw className="h-4 w-4" />
            {t('action.reset')}
          </Button>
          <Button onClick={handleSave} className="gap-2" disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
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
                  type="button"
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
                  type="button"
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
                  type="button"
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
                  type="button"
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

        <TabsContent value="general" className="space-y-6">
          {notConnected}
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
                  <Input id="siteName" value={siteName} onChange={(e) => setSiteName(e.target.value)} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="siteDescription">{t('settings.siteDescription')}</Label>
                  <Input id="siteDescription" value={siteDescription} onChange={(e) => setSiteDescription(e.target.value)} disabled />
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
                <Switch checked={maintenanceMode} onCheckedChange={setMaintenanceMode} disabled />
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

        <TabsContent value="llm" className="space-y-6">
          <Alert>
            <Bot className="h-4 w-4" />
            <AlertTitle>{t('settings.geminiOnlyTitle')}</AlertTitle>
            <AlertDescription>{t('settings.geminiOnlyDesc')}</AlertDescription>
          </Alert>
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
                  <Input value="Google Gemini" readOnly className="bg-muted" />
                </div>
                <div className="space-y-2">
                  <Label>{t('settings.model')}</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {GEMINI_MODELS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label htmlFor="apiKey" className="flex items-center gap-2">
                  <Key className="h-4 w-4" />
                  Gemini API Key
                </Label>
                <Input
                  id="apiKey"
                  type="password"
                  autoComplete="off"
                  placeholder={apiKeyConfigured ? t('settings.apiKeyPlaceholderKeep') : t('settings.apiKeyPlaceholder')}
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {apiKeyConfigured
                    ? `${t('settings.apiKeyConfiguredHint')} ${apiKeyLast4 || '****'}${t('settings.apiKeyConfiguredSuffix')}`
                    : t('settings.apiKeySecure')}
                </p>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="temperature">{t('settings.temperature')}</Label>
                  <Input id="temperature" type="number" min="0" max="2" step="0.1" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
                  <p className="text-xs text-muted-foreground">{t('settings.temperatureDesc')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="maxTokens">{t('settings.maxTokens')}</Label>
                  <Input id="maxTokens" type="number" min="100" max="32000" value={maxTokens} onChange={(e) => setMaxTokens(e.target.value)} />
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
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <Label>{t('settings.systemPromptOverride')}</Label>
                  <p className="text-xs text-muted-foreground">{t('settings.systemPromptOverrideDesc')}</p>
                </div>
                <Switch checked={systemPromptOverride} onCheckedChange={setSystemPromptOverride} />
              </div>
              <Textarea
                className="min-h-32"
                placeholder={t('settings.systemPromptPlaceholder')}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">{defaultPromptVi}</p>
            </CardContent>
          </Card>
        </TabsContent>

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
                  <Label>Embedding Model (sentence-transformers)</Label>
                  <Select value={embeddingModel} onValueChange={setEmbeddingModel}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {EMBEDDING_MODELS.map((m) => (
                        <SelectItem key={m} value={m}>{m}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">{t('settings.embeddingRestartHint')}</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="topK">Top K Results</Label>
                  <Input id="topK" type="number" min="1" max="50" value={topK} onChange={(e) => setTopK(e.target.value)} />
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
                  <p className="text-2xl font-bold">{stats.total_chunks}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.totalChunks')}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{stats.total_documents}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.documents')}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">{stats.embedding_dimension}</p>
                  <p className="text-sm text-muted-foreground">{t('settings.dimension')}</p>
                </div>
                <div className="p-4 rounded-lg bg-muted/50 text-center">
                  <p className="text-2xl font-bold">—</p>
                  <p className="text-sm text-muted-foreground">{t('settings.storage')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-6">
          {notConnected}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                {t('settings.emailNotif')}
              </CardTitle>
              <CardDescription>{t('settings.emailNotifConfig')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between opacity-60">
                <div className="space-y-0.5">
                  <Label>{t('settings.emailNotifLabel')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.emailNotifDesc')}</p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={setEmailNotifications} disabled />
              </div>
              <Separator />
              <div className="flex items-center justify-between opacity-60">
                <div className="space-y-0.5">
                  <Label>{t('settings.quizReminder')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.quizReminderDesc')}</p>
                </div>
                <Switch checked={quizReminders} onCheckedChange={setQuizReminders} disabled />
              </div>
              <Separator />
              <div className="flex items-center justify-between opacity-60">
                <div className="space-y-0.5">
                  <Label>{t('settings.systemAlerts')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.systemAlertsDesc')}</p>
                </div>
                <Switch checked={systemAlerts} onCheckedChange={setSystemAlerts} disabled />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          {notConnected}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {t('settings.securitySettings')}
              </CardTitle>
              <CardDescription>{t('settings.securityDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 opacity-60">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.2fa')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.2faDesc')}</p>
                </div>
                <Switch defaultChecked disabled />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.loginLimit')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.loginLimitDesc')}</p>
                </div>
                <Switch defaultChecked disabled />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>{t('settings.sessionTimeout')}</Label>
                  <p className="text-sm text-muted-foreground">{t('settings.sessionTimeoutDesc')}</p>
                </div>
                <Select defaultValue="30" disabled>
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
