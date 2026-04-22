import { useMemo, useState, useRef, useEffect } from 'react';
import { parseBackendDate } from '@/utils/dateUtils';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useLanguage } from '@/contexts/LanguageContext';
import { chatService, Conversation, Message, SSEEvent } from '@/services/chatService';
import { AVAILABLE_MODELS } from '@/constants/models';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Send, Plus, MessageSquare, Bot, Paperclip, BookOpen, Sparkles,
  Trash2, GraduationCap, Loader2, StopCircle, AlertTriangle, RotateCcw,
  Pencil, Check, X, Upload,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import ConfirmDeleteDialog from '@/components/shared/ConfirmDeleteDialog';
import { useChatStore, globalAbortControllers } from '@/stores/chatStore';
import { 
  useCourses, 
  useConversations, 
  useConversationMessages,
  useCreateConversation,
  useDeleteConversation,
  useAddMessageToCache,
  useUpdateConversationInCache,
  useRefetchAndMergeMessages,
  useInvalidateMessages,
  useUpdateMessageStatus,
  useTruncateMessages,
} from '@/hooks/useChat';
import { MessageContent } from '@/components/chat/MessageContent';
import { CopyButton } from '@/components/chat/CopyButton';
import { CollapsibleCitations } from '@/components/chat/CollapsibleCitations';
import { CitationModal } from '@/components/chat/CitationModal';
import { QuizCard } from '@/components/chat/QuizCard';
import { ParsedCitation, parseCitations } from '@/utils/citationParser';
import { formatTime } from '@/utils/citationParser';

function validPageNumber(pageNumber?: number | null): number | undefined {
  return typeof pageNumber === 'number' && pageNumber > 0 ? pageNumber : undefined;
}

export default function ChatPage() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const navigate = useNavigate();

  // ── Global state (Zustand) ─────────────────────────
  const { 
    sendingMap, 
    streamsMap, 
    selectedCourseId: persistedCourseId,
    activeConversationId: persistedConvId,
    setSending, 
    setStream, 
    clearStream, 
    clearSending,
    setSelectedCourseId: persistCourseId,
    setActiveConversationId: persistConvId,
  } = useChatStore();

  // ── TanStack Query hooks ────────────────────────────
  const { data: courses = [], isLoading: coursesLoading } = useCourses();
  const { data: conversations = [], isLoading: conversationsLoading } = useConversations(persistedCourseId);
  const createConversationMutation = useCreateConversation();
  const deleteConversationMutation = useDeleteConversation();
  const addMessageToCache = useAddMessageToCache();
  const updateMessageStatus = useUpdateMessageStatus();
  const updateConversationInCache = useUpdateConversationInCache();
  const refetchAndMergeMessages = useRefetchAndMergeMessages();
  const invalidateMessages = useInvalidateMessages();
  const truncateMessages = useTruncateMessages();

  // ── Local UI state ──────────────────────────────────
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(persistedCourseId);
  const [activeConversationId, setActiveConversationId] = useState<number | null>(persistedConvId);
  
  // Get active conversation from conversations list
  const activeConversation = conversations.find(c => c.id === activeConversationId) || null;
  
  // Get messages for active conversation using TanStack Query
  const { 
    data: messages = [], 
    isLoading: messagesLoading,
    isError: messagesError
  } = useConversationMessages(activeConversationId);

  // Auto-reset if conversation was deleted on backend
  useEffect(() => {
    if (messagesError && activeConversationId) {
      setActiveConversationId(null);
      persistConvId(null);
    }
  }, [messagesError, activeConversationId, persistConvId]);

  // ── UI state ────────────────────────────────────────
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    return localStorage.getItem('chatApp_selectedModel') || AVAILABLE_MODELS[0]?.id || 'gemini-2.0-flash';
  });
  const [showConversations, setShowConversations] = useState(!isMobile);
  const [deleteConvTarget, setDeleteConvTarget] = useState<Conversation | null>(null);
  const [citationModalOpen, setCitationModalOpen] = useState(false);
  const [selectedCitation, setSelectedCitation] = useState<ParsedCitation | null>(null);
  const [modalAllCitations, setModalAllCitations] = useState<any[]>([]);
  // Edit message state
  const [editingMessageId, setEditingMessageId] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentConvIdRef = useRef<number | null>(null);
  const draftIdRef = useRef<Record<number, number>>({}); // Track active draft IDs

  // Derived states for the currently active conversation
  const isActiveSending = activeConversationId ? !!sendingMap[activeConversationId] : false;
  const activeStream = activeConversationId ? streamsMap[activeConversationId] || '' : '';
  const isLoading = coursesLoading || conversationsLoading || messagesLoading;

  // Render Engine Rule B: Priority matching to prevent duplications
  // If the cache somehow already contains the draft's completed or partial content, we hide the draft stream
  const currentDraftId = activeConversationId ? draftIdRef.current[activeConversationId] : null;
  const hasCachedOptimisticMessage = messages.some(m => 
    m.role === 'assistant' && (
      (currentDraftId && m.id === currentDraftId) || 
      (activeStream && m.content && (m.content === activeStream || m.content.startsWith(activeStream.slice(0, 100))))
    )
  );
  const shouldRenderDraft = isActiveSending && activeStream && !hasCachedOptimisticMessage;

  // Detect orphan user message (last msg is user with no assistant reply — e.g. F5 during processing)
  const lastMessage = messages.length > 0 ? messages[messages.length - 1] : null;
  const hasOrphanUserMessage = !isActiveSending && !messagesLoading && lastMessage?.role === 'user';


  // ── Effects ─────────────────────────────────────────
  useEffect(() => {
    currentConvIdRef.current = activeConversationId;
  }, [activeConversationId]);

  useEffect(() => {
    localStorage.setItem('chatApp_selectedModel', selectedModel);
  }, [selectedModel]);

  // Sync local selectedCourseId with persisted value
  useEffect(() => {
    if (persistedCourseId !== selectedCourseId) {
      setSelectedCourseId(persistedCourseId);
    }
  }, [persistedCourseId]);

  // Sync local activeConversationId with persisted value
  useEffect(() => {
    if (persistedConvId !== activeConversationId) {
      setActiveConversationId(persistedConvId);
    }
  }, [persistedConvId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, activeStream]);

  // ── Handlers ────────────────────────────────────────

  const handleCitationClick = (citation: ParsedCitation, allCitations: any[]) => {
    setSelectedCitation(citation);
    setModalAllCitations(allCitations);
    setCitationModalOpen(true);
  };

  const handleStopGenerating = (targetConvId?: number) => {
    const id = targetConvId || activeConversation?.id;
    if (!id) return;
    const controller = globalAbortControllers.get(id);
    if (controller) {
      controller.abort();
      globalAbortControllers.delete(id);
      clearSending(id);
      // We do not clear streamsMap so the UI retains the partial message
    }
  };

  const resolvePersistedMessageId = async (
    conversationId: number,
    optimisticMessageId: number,
  ): Promise<number | null> => {
    const localIndex = messages.findIndex((message) => message.id === optimisticMessageId);
    const localMessage = localIndex >= 0 ? messages[localIndex] : null;
    if (!localMessage) return null;

    try {
      const detail = await chatService.getConversation(conversationId);
      const serverMessages = detail.messages;

      const indexedCandidate = localIndex >= 0 ? serverMessages[localIndex] : null;
      if (
        indexedCandidate &&
        indexedCandidate.role === localMessage.role &&
        indexedCandidate.content === localMessage.content
      ) {
        return indexedCandidate.id;
      }

      for (let i = serverMessages.length - 1; i >= 0; i -= 1) {
        const candidate = serverMessages[i];
        if (candidate.role === localMessage.role && candidate.content === localMessage.content) {
          return candidate.id;
        }
      }

      const localRoleOrdinal =
        messages
          .slice(0, localIndex + 1)
          .filter((message) => message.role === localMessage.role).length - 1;
      const serverRoleMatches = serverMessages.filter((message) => message.role === localMessage.role);
      const ordinalCandidate = serverRoleMatches[localRoleOrdinal];
      return ordinalCandidate?.id ?? null;
    } catch (error) {
      console.error('Failed to resolve persisted message ID:', error);
      return null;
    }
  };

  const handleNewConversation = async () => {
    if (!selectedCourseId) return;
    try {
      const newConv = await createConversationMutation.mutateAsync(selectedCourseId);
      setActiveConversationId(newConv.id);
      persistConvId(newConv.id);
      if (isMobile) setShowConversations(false);
      toast({ title: t('toast.created'), description: t('chat.created') });
    } catch (err: any) {
      console.error('Failed to create conversation:', err);
      toast({ title: 'Lỗi', description: err.message || 'Không thể tạo cuộc trò chuyện', variant: 'destructive' });
    }
  };

  const handleSelectConversation = async (conv: Conversation) => {
    if (activeConversationId === conv.id) return;
    
    // When switching conversations:
    // ✅ DON'T abort - let stream continue in background
    // ✅ DON'T clear sending state - preserve streaming state
    // ✅ DON'T clear stream content - keep in Zustand
    // Just switch the active conversation ID
    
    setActiveConversationId(conv.id);
    persistConvId(conv.id);
    if (isMobile) setShowConversations(false);
  };

  const handleDeleteConversation = async () => {
    if (!deleteConvTarget || !selectedCourseId) return;
    
    // Clean up global state for this conversation
    const convId = deleteConvTarget.id;
    clearStream(convId);
    clearSending(convId);
    globalAbortControllers.get(convId)?.abort();
    globalAbortControllers.delete(convId);
    
    // ✅ Move this BEFORE mutateAsync to prevent React Query from refetching the deleted ID
    if (activeConversationId === convId) {
      setActiveConversationId(null);
      persistConvId(null);
    }
    
    try {
      await deleteConversationMutation.mutateAsync({ conversationId: convId, courseId: selectedCourseId });
      toast({ title: t('toast.deleted'), description: `"${deleteConvTarget.title || 'Cuộc trò chuyện'}" ${t('toast.deleted').toLowerCase()}.` });
    } catch (err) {
      console.error('Failed to delete conversation:', err);
      toast({ title: 'Lỗi', description: 'Không thể xóa cuộc trò chuyện', variant: 'destructive' });
    } finally {
      setDeleteConvTarget(null);
    }
  };

  // ── Edit message (rollback + re-process) ──────────────
  const handleEditMessage = async (messageId: number, newContent: string) => {
    if (!newContent.trim() || !activeConversationId || isActiveSending) return;

    const convId = activeConversationId;
    let persistedMessageId = messageId;

    if (messageId > 1e12) {
      const resolvedMessageId = await resolvePersistedMessageId(convId, messageId);
      if (!resolvedMessageId) {
        toast({
          title: 'Lỗi',
          description: 'Tin nhắn này chưa đồng bộ xong với máy chủ. Hãy thử lại sau 1-2 giây.',
          variant: 'destructive',
        });
        return;
      }
      persistedMessageId = resolvedMessageId;
    }

    setEditingMessageId(null);
    setEditingContent('');
    setSending(convId, true);
    clearStream(convId);

    // Immediately truncate messages after the edited one + update content
    truncateMessages(convId, messageId, newContent);

    try {
      let assistantContent = '';
      let citations: any[] = [];
      let metadata: any = {};
      let totalTimeMs: number | null = null;
      let agentMetadata: any = null;
      let editHadTerminalError = false;

      const tempAssistantMsgId = Date.now() + 1;
      draftIdRef.current[convId] = tempAssistantMsgId;

      const controller = new AbortController();
      globalAbortControllers.set(convId, controller);

      await chatService.editMessage(
        convId,
        persistedMessageId,
        newContent,
        (event: SSEEvent) => {
          if (event.type === 'token' && event.content) {
            assistantContent += event.content;
            setStream(convId, assistantContent);
          } else if (event.type === 'citations' && event.citations) {
            citations = event.citations;
          } else if (event.type === 'metadata') {
            metadata = event;
            totalTimeMs = event.total_time_ms || null;
            if (event.agent_metadata) agentMetadata = event.agent_metadata;
          } else if (event.type === 'error') {
            console.error('Edit SSE Error:', event.message);
            editHadTerminalError = true;

            let errorIcon = '⚠️';
            const errorMessage = event.message || 'Đã xảy ra lỗi';

            if (event.code === 'PII_DETECTED') {
              errorIcon = '🔒';
            } else if (event.code === 'RAG_TIMEOUT' || event.code === 'AGENT_TIMEOUT') {
              errorIcon = '⏰';
            } else if (event.code === 'RATE_LIMIT') {
              errorIcon = '⏱️';
            }

            const errorMsg: Message = {
              id: Date.now() + 1,
              conversation_id: convId,
              role: 'assistant',
              content: `${errorIcon} ${errorMessage}`,
              created_at: new Date().toISOString(),
              citations: [],
              tokens_used: null,
              model_used: null,
              trace_id: event.trace_id || null,
            };

            addMessageToCache(convId, errorMsg);
            setSending(convId, false);
            clearStream(convId);
            toast({ title: 'Lỗi AI', description: errorMessage, variant: 'destructive' });
            return;
            toast({ title: 'Lỗi', description: event.message || 'Đã xảy ra lỗi', variant: 'destructive' });
          }
        },
        (error) => console.error('Edit stream error:', error),
        async () => {
          // Keep sending=true until the server state is refetched.
          // Otherwise the orphan-message retry hint flashes while the edited
          // user message is temporarily the last cached message.
          await refetchAndMergeMessages(convId);
          if (editHadTerminalError) {
            globalAbortControllers.delete(convId);
            return;
          }
          setSending(convId, false);
          clearStream(convId);
          globalAbortControllers.delete(convId);
        },
        selectedModel,
        controller.signal
      );
    } catch (error: any) {
      setSending(convId, false);
      clearStream(convId);
      if (error.name !== 'AbortError') {
        toast({ title: 'Lỗi', description: error.message, variant: 'destructive' });
      }
    }
  };

  // ── Send message (SSE streaming) ────────────────────
  const handleSendMessageWithContent = async (contentText: string) => {
    if (!contentText.trim() || !activeConversationId || isActiveSending) return;

    const convId = activeConversationId;
    const userText = contentText.trim();
    setInputValue('');
    
    setSending(convId, true);
    clearStream(convId);

    // Optimistic user bubble - add to cache immediately
    const tempUserMsg: Message = {
      id: Date.now(),
      conversation_id: convId,
      role: 'user',
      content: userText,
      tokens_used: null,
      model_used: null,
      trace_id: null,
      citations: [],
      created_at: new Date().toISOString(),
    };
    addMessageToCache(convId, tempUserMsg);

    try {
      let assistantContent = '';
      let citations: any[] = [];
      let metadata: any = {};
      let totalTimeMs: number | null = null;
      let savedConfirmed = false; // Track backend save confirmation
      let confirmedMessageId: number | null = null;
      let agentMetadata: any = null;
      
      const tempAssistantMsgId = Date.now() + 1; // Prepare pessimistic temporary ID
      draftIdRef.current[convId] = tempAssistantMsgId; // Track this draft's ID

      const controller = new AbortController();
      globalAbortControllers.set(convId, controller);

      await chatService.sendMessage(
        convId,
        userText,
        (event: SSEEvent) => {
          // ✅ DON'T abort when user switches - let stream continue in background
          // Only update UI stream if still viewing this conversation
          
          if (event.type === 'token' && event.content) {
            assistantContent += event.content;
            // ✅ Safely update this conversation's stream (Zustand automatically maps it to convId)
            setStream(convId, assistantContent);
          } else if (event.type === 'citations' && event.citations) {
            citations = event.citations;
          } else if (event.type === 'saved') {
            // ✅ NEW: Handle backend save confirmation
            console.log('✅ Backend confirmed message saved:', {
              message_id: event.message_id,
              timestamp: event.timestamp,
              trace_id: event.trace_id,
            });
            savedConfirmed = true;
            confirmedMessageId = event.message_id;
            
            // Try updating cache just in case the msg was already pushed
            updateMessageStatus(convId, tempAssistantMsgId, { status: 'saved', realId: event.message_id });
          } else if (event.type === 'metadata') {
            metadata = event;
            totalTimeMs = event.total_time_ms || null;
            if (event.agent_metadata) {
              agentMetadata = event.agent_metadata;
            }
            
            // 🔍 DEBUG: Log time info
            console.log('⏱️ Time tracking:', {
              total_time_ms: event.total_time_ms,
              totalTimeMs: totalTimeMs,
              metadata: metadata,
            });
            
            // 🔍 DEBUG: Log intent detection info
            if (metadata.quality_scores) {
              console.log('🎯 Intent Detection:', {
                intent: metadata.quality_scores.intent,
                confidence: metadata.quality_scores.confidence,
                retrieval_fallback: metadata.quality_scores.retrieval_fallback,
                agent_flow: metadata.quality_scores.agent_flow,
                model: metadata.model,
              });
            }
            
            // Update sidebar title if backend generated/updated it
            if (event.conversation_title && activeConversation && selectedCourseId) {
              const updated = { ...activeConversation, title: event.conversation_title };
              updateConversationInCache(selectedCourseId, updated);
            }
          } else if (event.type === 'error') {
            // Handle error events properly - stop streaming and show error message in chat
            console.error('SSE Error:', event.message, 'Code:', event.code);
            
            // Stop streaming state and clear stream immediately
            setSending(convId, false);
            clearStream(convId);
            
            // Determine error icon and message based on error code
            let errorIcon = '⚠️';
            let errorMessage = event.message || 'Đã xảy ra lỗi';
            
            if (event.code === 'PII_DETECTED') {
              errorIcon = '🔒';
            } else if (event.code === 'GUARDRAIL_BLOCKED') {
              errorIcon = '⚠️';
            } else if (event.code === 'RAG_TIMEOUT' || event.code === 'AGENT_TIMEOUT') {
              errorIcon = '⏰';
            } else if (event.code === 'RATE_LIMIT') {
              errorIcon = '⏱️';
            }
            
            // Add error message as assistant message in chat UI
            const errorMsg: Message = {
              id: Date.now() + 1,
              conversation_id: convId,
              role: 'assistant',
              content: `${errorIcon} ${errorMessage}`,
              created_at: new Date().toISOString(),
              citations: [],
              tokens_used: null,
              model_used: null,
              trace_id: event.trace_id || null,
            };
            
            addMessageToCache(convId, errorMsg);
            
            // ✅ FIX: Clear sending state so skeleton "..." disappears after error
            clearStream(convId);
            clearSending(convId);
            
            // Also show toast for visibility
            toast({ 
              title: 'Lỗi AI', 
              description: errorMessage, 
              variant: 'destructive' 
            });
            
            // IMPORTANT: Return early to prevent further processing
            return;
          }
        },
        (error) => {
          if (error.name === 'AbortError' || error.message.includes('abort')) return;
          console.error('Stream error:', error);
          toast({ title: 'Lỗi', description: 'Lỗi khi gửi tin nhắn', variant: 'destructive' });
        },
        async () => {
          // On complete - add message to cache regardless of which conversation user is viewing
          
          // Only add message if there's actual content (not error case)
          if (assistantContent.trim()) {
            const assistantMsg: Message = {
              id: savedConfirmed && confirmedMessageId ? confirmedMessageId : tempAssistantMsgId,
              status: savedConfirmed ? 'saved' : 'pending',
              conversation_id: convId,
              role: 'assistant',
              content: assistantContent,
              tokens_used: metadata.tokens_used || null,
              model_used: metadata.model || null,
              trace_id: metadata.trace_id || null,
              citations: citations,
              retrieval_fallback: metadata.quality_scores?.retrieval_fallback || false,
              total_time_ms: totalTimeMs,
              created_at: new Date().toISOString(),
              agent_metadata: agentMetadata || null,
            };
            
            // 🔍 DEBUG: Log assistant message creation
            console.log('💬 Optimized creation assistant msg:', {
              id: assistantMsg.id,
              status: assistantMsg.status,
              total_time_ms: assistantMsg.total_time_ms,
            });

            // ✅ Add to cache FIRST, then clear draft — prevents blank frame flash
            addMessageToCache(convId, assistantMsg);
            clearStream(convId);
            await refetchAndMergeMessages(convId);
            clearSending(convId);
            
            // ✅ Fallback confirmation check if the 'saved' event didn't arrive gracefully
            if (!savedConfirmed) {
              console.warn('⚠️ Fallback polling initiated for conv:', convId);
              let fallbackChecks = 0;
              const pollInterval = setInterval(async () => {
                fallbackChecks++;
                if (fallbackChecks > 10) {
                  clearInterval(pollInterval);
                  console.warn('⚠️ Timed out waiting for saved status in conv:', convId);
                  return;
                }
                
                try {
                  const detail = await chatService.getConversation(convId);
                  const foundRealMsg = detail.messages.find(m => 
                    m.trace_id === assistantMsg.trace_id || 
                    (m.content === assistantMsg.content && m.role === 'assistant')
                  );
                  
                  if (foundRealMsg) {
                    clearInterval(pollInterval);
                    updateMessageStatus(convId, tempAssistantMsgId, { status: 'saved', realId: foundRealMsg.id });
                  }
                } catch (e) {
                  console.error('Refetch fallback failed:', e);
                }
              }, 1000); // Check every second for up to 10 seconds
            }
          } else {
            // No content - clear immediately
            clearSending(convId);
          }
          
          globalAbortControllers.delete(convId);

          // Update conversation title in cache
          if (assistantContent.trim() && selectedCourseId) {
            chatService.getConversation(convId).then((detail) => {
              if (detail) {
                const updatedConv: Conversation = {
                  ...activeConversation!,
                  title: detail.title,
                  message_count: (activeConversation?.message_count || 0) + 2,
                };
                updateConversationInCache(selectedCourseId, updatedConv);
              }
            }).catch(() => { });
          }
        },
        selectedModel,
        controller.signal,
      );
    } catch (error: any) {
      if (error.name === 'AbortError' || error.message?.includes('abort')) return;
      console.error('Failed to send message:', error);
      toast({ title: 'Lỗi', description: error.message || 'Không thể gửi tin nhắn', variant: 'destructive' });
      clearSending(convId);
      clearStream(convId);
    } finally {
      globalAbortControllers.delete(convId);
    }
  };

  const handleSendMessage = async () => {
    handleSendMessageWithContent(inputValue);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  const currentCourse = courses.find((c) => c.id === selectedCourseId);

  // ── RENDER ──────────────────────────────────────────
  return (
    <div className="flex h-full">
      {/* ═══ Sidebar ═══ */}
      <div className={cn(
        'border-r bg-card flex flex-col transition-all duration-300',
        isMobile ? (showConversations ? 'w-full absolute inset-0 z-20' : 'w-0 overflow-hidden') : 'w-72'
      )}>
        {/* New Conversation */}
        <div className="p-4 border-b mb-0">
          <Button variant="default" className="w-full gap-2" onClick={handleNewConversation} disabled={!selectedCourseId}>
            <Plus className="h-4 w-4" />
            {t('chat.newConversation')}
          </Button>
        </div>

        {/* Course Selector */}
        <div className="p-4 border-b">
          <Select value={selectedCourseId?.toString() || ''} onValueChange={(v) => {
            const courseId = parseInt(v);
            setSelectedCourseId(courseId);
            persistCourseId(courseId); // Persist here instead of useEffect
          }}>
            <SelectTrigger className="h-9">
              <BookOpen className="h-4 w-4 mr-2 text-primary" />
              <SelectValue placeholder={t('chat.selectCourse')} />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id.toString()}>
                  {course.code ? `${course.code} - ` : ''}{course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Conversations List */}
        <ScrollArea className="flex-1 w-full">
          <div className="p-2 space-y-1 max-w-full overflow-hidden">
            {isLoading && conversations.length === 0 ? (
              <div className="p-4 text-center text-muted-foreground">
                <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2" />
                <p className="text-xs">{t('loading.text')}</p>
              </div>
            ) : conversations.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-30" />
                <p className="text-xs">Chưa có cuộc trò chuyện</p>
              </div>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleSelectConversation(conv)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') handleSelectConversation(conv);
                  }}
                  className={cn(
                    'w-full max-w-full overflow-hidden p-3 rounded-lg text-left transition-all duration-200 group flex items-start gap-3',
                    activeConversation?.id === conv.id
                      ? 'bg-primary/10 text-primary border border-primary/20'
                      : 'hover:bg-secondary text-foreground border border-transparent'
                  )}
                >
                  <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0 overflow-hidden w-full">
                    <p className="text-sm font-medium truncate w-full block">{conv.title || 'Cuộc trò chuyện'}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
                      {conv.message_count} tin nhắn • {parseBackendDate(conv.created_at).toLocaleDateString('vi-VN')}
                    </p>
                  </div>
                  <button
                    className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all shrink-0"
                    onClick={(e) => { e.stopPropagation(); setDeleteConvTarget(conv); }}
                  >
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      {/* ═══ Main Chat Area ═══ */}
      <div className={cn('flex-1 flex flex-col min-w-0', isMobile && showConversations && 'hidden')}>
        {/* Header */}
        <div className="h-14 border-b flex items-center justify-between px-3 sm:px-6 bg-card/80 dark:bg-card/60 backdrop-blur-sm">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            {isMobile && (
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setShowConversations(true)}>
                <MessageSquare className="h-4 w-4" />
              </Button>
            )}
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="font-semibold text-sm truncate">{currentCourse?.name || 'Chọn môn học'}</h2>
              <p className="text-xs text-muted-foreground">{currentCourse?.code || ''}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-56 h-8 text-[11px] sm:text-xs">
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary shrink-0" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center justify-between w-full min-w-[160px] gap-2">
                      <span className="text-[11px] sm:text-xs truncate">{model.name}</span>
                      <Badge variant="outline" className="ml-auto text-[10px] h-4 shrink-0">{model.cost}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1">
          <div className="max-w-3xl mx-auto space-y-6 p-4 sm:p-6">
            {/* Welcome Screen */}
            {!activeConversationId && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 ai-glow">
                  <GraduationCap className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">{t('chat.welcomeTitle')}</h2>
                <p className="text-muted-foreground max-w-sm mb-8">{t('chat.welcomeDesc')}</p>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  {[t('chat.suggestion1'), t('chat.suggestion2'), t('chat.suggestion3'), t('chat.suggestion4')].map((q) => (
                    <Button key={q} variant="outline" className="text-sm h-auto py-3 justify-start" onClick={() => setInputValue(q)}>
                      <Sparkles className="h-3.5 w-3.5 mr-2 text-primary shrink-0" />{q}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading conversation */}
            {activeConversationId && messagesLoading && messages.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground text-sm">{t('loading.text')}</p>
              </div>
            )}

            {/* Empty conversation */}
            {activeConversationId && !messagesLoading && messages.length === 0 && !isActiveSending && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
                  <Bot className="h-8 w-8 text-primary" />
                </div>
                <h3 className="text-lg font-semibold mb-1">Bắt đầu cuộc trò chuyện</h3>
                <p className="text-muted-foreground text-sm max-w-sm">Hãy đặt câu hỏi về nội dung tài liệu môn học.</p>
              </div>
            )}

            {/* Message Bubbles */}
            {messages.map((message) => (
              <div key={message.id} className={cn('flex gap-4 message-appear group relative', message.role === 'user' ? 'flex-row-reverse' : '')}>
                <Avatar className="h-8 w-8 shrink-0">
                  {message.role === 'user' ? (
                    <>
                      <AvatarImage src={(user as any)?.avatar_url || (user as any)?.avatarUrl} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {(user as any)?.full_name?.charAt(0) || (user as any)?.fullName?.charAt(0) || 'U'}
                      </AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback className="bg-accent text-accent-foreground"><Bot className="h-4 w-4" /></AvatarFallback>
                  )}
                </Avatar>
                <div className={cn('flex-1 space-y-2', message.role === 'user' ? 'text-right' : '')}>
                  {/* Check if this is an error message (starts with emoji indicators) */}
                  {(() => {
                    const isErrorMessage = message.role === 'assistant' && 
                      (message.content.startsWith('⚠️') || 
                       message.content.startsWith('🔒') || 
                       message.content.startsWith('⏰') ||
                       message.content.startsWith('⏱️'));
                    
                    return (
                      <div className={cn(
                        'inline-block rounded-2xl px-4 py-3 max-w-full text-sm relative',
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground rounded-tr-sm'
                          : isErrorMessage
                            ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-100 rounded-tl-sm'
                            : 'bg-secondary dark:bg-secondary/80 text-foreground rounded-tl-sm'
                      )}>
                        {/* Copy Button */}
                        <CopyButton 
                          content={message.content} 
                          position={message.role === 'user' ? 'left' : 'right'} 
                        />
                        
                        {/* Edit Button for user messages */}
                        {message.role === 'user' && !isActiveSending && editingMessageId !== message.id && (
                          <button
                            onClick={() => {
                              setEditingMessageId(message.id);
                              setEditingContent(message.content);
                            }}
                            className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-full hover:bg-muted"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        )}
                        
                        {/* Message Content */}
                        {message.role === 'assistant' && message.citations && message.citations.length > 0 ? (
                          <MessageContent 
                            content={message.content}
                            citations={message.citations}
                            onCitationClick={(citation) => handleCitationClick(citation, message.citations || [])}
                          />
                        ) : message.role === 'assistant' ? (
                          <div className="prose prose-sm max-w-none dark:prose-invert [&_strong]:text-inherit [&_h3]:text-inherit [&_code]:text-inherit">
                            <div className="break-words">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {message.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        ) : editingMessageId === message.id ? (
                          /* Inline Edit Mode */
                          <div className="space-y-2 min-w-[200px]">
                            <textarea
                              value={editingContent}
                              onChange={(e) => setEditingContent(e.target.value)}
                              className="w-full bg-primary-foreground/20 text-primary-foreground rounded-lg px-3 py-2 text-sm resize-none border border-primary-foreground/30 focus:outline-none focus:border-primary-foreground/50"
                              rows={Math.max(1, editingContent.split('\n').length)}
                              autoFocus
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault();
                                  handleEditMessage(message.id, editingContent);
                                }
                                if (e.key === 'Escape') {
                                  setEditingMessageId(null);
                                  setEditingContent('');
                                }
                              }}
                            />
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => { setEditingMessageId(null); setEditingContent(''); }}
                                className="p-1 rounded hover:bg-primary-foreground/20"
                                title="Hủy"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleEditMessage(message.id, editingContent)}
                                className="p-1 rounded hover:bg-primary-foreground/20"
                                title="Lưu & gửi lại"
                                disabled={!editingContent.trim()}
                              >
                                <Check className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p>{message.content}</p>
                        )}
                      </div>
                    );
                  })()}

                  {/* Retrieval Fallback Warning */}
                  {message.retrieval_fallback && (
                    <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20 max-w-fit">
                      <AlertTriangle className="h-3.5 w-3.5 text-yellow-600 mt-0.5 shrink-0" />
                      <p className="text-xs text-yellow-700 dark:text-yellow-400">Độ tin cậy RAG thấp — câu trả lời có thể không chính xác.</p>
                    </div>
                  )}

                  {/* Collapsible Citations — only show citations actually referenced in text */}
                  {message.citations && message.citations.length > 0 && (() => {
                    const { citationMap } = parseCitations(message.content, message.citations);
                    const parsedCitations = Array.from(citationMap.values()).sort((a, b) => a.index - b.index);

                    const displayCitations = parsedCitations.length > 0
                      ? parsedCitations.map((parsed) => ({
                          chunk_id: parsed.citationData?.chunk_id,
                          document_title: parsed.citationData?.document_title || parsed.documentTitle,
                          page_number: validPageNumber(parsed.citationData?.page_number) ?? validPageNumber(parsed.pageNumber),
                          relevance_score: parsed.citationData?.relevance_score,
                          quote: parsed.citationData?.quote,
                        }))
                      : message.citations.reduce((acc: typeof message.citations, citation) => {
                          const exists = acc.some((item) =>
                            item.document_title === citation.document_title &&
                            item.page_number === citation.page_number
                          );
                          if (!exists) acc.push(citation);
                          return acc;
                        }, []);

                    if (displayCitations.length === 0) return null;

                    return (
                      <CollapsibleCitations
                        citations={displayCitations}
                        onCitationClick={(index) => {
                          const parsed = parsedCitations[index - 1];
                          if (parsed) {
                            const modalCitations = parsed.citationData ? (message.citations || []) : displayCitations;
                            handleCitationClick(parsed, modalCitations);
                            return;
                          }

                          const citation = displayCitations[index - 1];
                          if (citation) {
                            handleCitationClick(
                              {
                                index,
                                originalText: citation.page_number
                                  ? `[${citation.document_title}, trang ${citation.page_number}]`
                                  : `[${citation.document_title}]`,
                                documentTitle: citation.document_title,
                                pageNumber: validPageNumber(citation.page_number) ?? null,
                                citationData: citation,
                              },
                              displayCitations
                            );
                          }
                        }}
                      />
                    );
                  })()}

                  {/* Quiz Card — shown when bot generates a quiz via agent */}
                  {message.role === 'assistant' && message.agent_metadata?.quiz_id && (
                    <QuizCard
                      quizId={message.agent_metadata.quiz_id as number}
                      quizTitle={(message.agent_metadata.quiz_title as string) || 'Quiz mới'}
                      questionCount={(message.agent_metadata.question_count as number) || 5}
                      courseName={currentCourse?.name}
                    />
                  )}

                  {/* Model / token / time info */}
                  {(message.model_used || message.status === 'pending') && (
                    <p className="text-[11px] text-muted-foreground/60 flex items-center gap-1.5 flex-wrap">
                      {message.model_used}
                      {message.tokens_used ? ` • ${message.tokens_used} tokens` : ''}
                      {message.total_time_ms ? ` • ${formatTime(message.total_time_ms)}` : ''}
                      {message.status === 'pending' && (
                        <span className="flex items-center gap-1 text-primary/70 ml-2">
                          <Loader2 className="h-3 w-3 animate-spin inline" />
                          <span>Đang lưu...</span>
                        </span>
                      )}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {/* Orphan user message — show retry hint */}
            {hasOrphanUserMessage && (
              <div className="flex gap-4 message-appear">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-accent text-accent-foreground"><Bot className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="bg-secondary/60 rounded-2xl rounded-tl-sm px-4 py-3">
                  <p className="text-sm text-muted-foreground mb-2">
                    ⚠️ Câu hỏi chưa được trả lời (có thể do tải lại trang)
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-2"
                    onClick={() => {
                      if (!lastMessage || !activeConversationId) return;
                      const retryContent = lastMessage.content;
                      if (lastMessage.id > 1e12) {
                        handleSendMessageWithContent(retryContent);
                      } else {
                        handleEditMessage(lastMessage.id, retryContent);
                      }
                    }}
                  >
                    <RotateCcw className="h-3 w-3" />
                    Gửi lại
                  </Button>
                </div>
              </div>
            )}

            {/* Retrieving Skeleton - show when sending but no stream yet */}
            {isActiveSending && !activeStream && (
              <div className="flex gap-4 message-appear">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-accent text-accent-foreground"><Bot className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="bg-secondary dark:bg-secondary/80 rounded-2xl rounded-tl-sm px-4 py-3 flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">
                    Đang tìm kiếm tài liệu...
                  </p>
                </div>
              </div>
            )}

            {/* Streaming Message - show when actively sending AND has stream content AND not already in cache */}
            {shouldRenderDraft && (
              <div className="flex gap-4 message-appear">
                <Avatar className="h-8 w-8 shrink-0">
                  <AvatarFallback className="bg-accent text-accent-foreground"><Bot className="h-4 w-4" /></AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-2 min-w-0">
                  <div className="inline-block rounded-2xl rounded-tl-sm px-4 py-3 max-w-full text-sm bg-secondary dark:bg-secondary/80 text-foreground relative">
                    {/* Copy Button for streaming content */}
                    <CopyButton content={activeStream} position="right" />
                    
                    <div className="prose prose-sm max-w-none dark:prose-invert [&_strong]:text-inherit [&_h3]:text-inherit [&_code]:text-inherit">
                      <div className="break-words">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {activeStream}
                        </ReactMarkdown>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1.5 px-2">
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary/60" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary/60" />
                    <span className="typing-dot h-1.5 w-1.5 rounded-full bg-primary/60" />
                  </div>
                </div>
              </div>
            )}

            {/* This ensures scrolling to the bottom when messages or the active stream update */}
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* ═══ Input Area ═══ */}
        <div className="border-t p-2 sm:p-4 bg-card/80 dark:bg-card/60 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-secondary/50 dark:bg-secondary/30 border border-border/40 focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/30 transition-all">
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0 h-8 w-8"
                title="Upload tài liệu"
                onClick={() => {
                  if (selectedCourseId) {
                    navigate(`/courses/${selectedCourseId}?upload=true`);
                  } else {
                    toast({
                      title: "Chưa chọn môn học",
                      description: "Vui lòng chọn môn học trước khi upload tài liệu.",
                      variant: "default",
                    });
                  }
                }}
              >
                <Upload className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('chat.placeholder')}
                disabled={isActiveSending || !activeConversationId}
                className="border-0 bg-transparent focus-visible:ring-0 flex-1 h-8 text-sm"
              />
              {isActiveSending ? (
                <Button onClick={() => handleStopGenerating()} variant="destructive" size="sm" className="gap-1.5 rounded-lg h-8">
                  <StopCircle className="h-3.5 w-3.5" />
                  <span className="text-xs hidden sm:inline">Dừng</span>
                </Button>
              ) : (
                <Button onClick={handleSendMessage} disabled={!inputValue.trim() || !activeConversationId} size="sm" className="gap-1.5 rounded-lg h-8">
                  <Send className="h-3.5 w-3.5" />
                  <span className="text-xs">{t('action.send')}</span>
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ═══ Delete Confirmation ═══ */}
      <ConfirmDeleteDialog
        open={!!deleteConvTarget}
        onOpenChange={(open) => !open && setDeleteConvTarget(null)}
        title={t('confirm.deleteConversation')}
        description={`${t('confirm.sure')} "${deleteConvTarget?.title || 'Cuộc trò chuyện'}"? ${t('confirm.irreversible')}`}
        onConfirm={handleDeleteConversation}
      />

      {/* ═══ Citation Modal ═══ */}
      <CitationModal
        isOpen={citationModalOpen}
        onClose={() => setCitationModalOpen(false)}
        citation={selectedCitation}
        allCitations={modalAllCitations}
      />
    </div>
  );
}
