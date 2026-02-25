import { useState, useRef, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Message, Conversation, AVAILABLE_MODELS } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Send, Plus, MessageSquare, Bot, Paperclip, Settings,
  BookOpen, Sparkles, FileText, Trash2, GraduationCap,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const mockConversations: Conversation[] = [
  { id: '1', userId: '3', courseId: '3', title: 'Hỏi về OOP và tính đa hình', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastMessage: 'Đa hình là gì?' },
  { id: '2', userId: '3', courseId: '1', title: 'Vòng lặp trong Python', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastMessage: 'Cách sử dụng for loop' },
  { id: '3', userId: '3', courseId: '2', title: 'Thuật toán sắp xếp', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(), lastMessage: 'Quick sort hoạt động như nào?' },
];

const mockMessages: Message[] = [
  {
    id: '1', conversationId: '1', role: 'user',
    content: 'OOP là gì?',
    createdAt: new Date(Date.now() - 60000).toISOString(),
  },
  {
    id: '2', conversationId: '1', role: 'assistant',
    content: `**OOP (Object-Oriented Programming)** là một mô hình lập trình dựa trên khái niệm "đối tượng" (objects).

## 4 tính chất chính của OOP:

1. **Đóng gói (Encapsulation)**: Gói dữ liệu và phương thức vào trong một đơn vị (class), ẩn chi tiết triển khai.

2. **Kế thừa (Inheritance)**: Cho phép class con kế thừa thuộc tính và phương thức từ class cha.

3. **Đa hình (Polymorphism)**: Cùng một phương thức có thể hoạt động khác nhau tùy thuộc vào đối tượng.

4. **Trừu tượng (Abstraction)**: Ẩn đi chi tiết phức tạp, chỉ hiển thị những gì cần thiết.

\`\`\`java
// Ví dụ về class trong Java
public class Animal {
    private String name;
    
    public void speak() {
        System.out.println("Some sound");
    }
}
\`\`\``,
    tokensUsed: 250, modelUsed: 'gpt-4',
    createdAt: new Date(Date.now() - 55000).toISOString(),
    citations: [
      { id: '1', messageId: '2', chunkId: 'c1', relevanceScore: 0.89, quote: 'OOP có 4 tính chất chính...', documentName: 'slide_chuong2.pdf', pageNumber: 15 },
      { id: '2', messageId: '2', chunkId: 'c2', relevanceScore: 0.76, quote: 'Đa hình cho phép...', documentName: 'giaotrinh.pdf', pageNumber: 42 },
    ],
  },
  {
    id: '3', conversationId: '1', role: 'user',
    content: 'Cho tôi ví dụ về tính đa hình trong Java',
    createdAt: new Date(Date.now() - 30000).toISOString(),
  },
  {
    id: '4', conversationId: '1', role: 'assistant',
    content: `Đây là ví dụ về **đa hình (Polymorphism)** trong Java:

\`\`\`java
class Animal {
    public void makeSound() {
        System.out.println("Some generic sound");
    }
}

class Dog extends Animal {
    @Override
    public void makeSound() {
        System.out.println("Woof! Woof!");
    }
}

class Cat extends Animal {
    @Override
    public void makeSound() {
        System.out.println("Meow!");
    }
}

public class Main {
    public static void main(String[] args) {
        Animal myDog = new Dog();
        Animal myCat = new Cat();
        
        myDog.makeSound();  // Output: Woof! Woof!
        myCat.makeSound();  // Output: Meow!
    }
}
\`\`\`

Trong ví dụ trên, cùng phương thức \`makeSound()\` nhưng mỗi đối tượng lại có hành vi khác nhau. Đây chính là **đa hình runtime** (method overriding).`,
    tokensUsed: 180, modelUsed: 'gpt-4',
    createdAt: new Date(Date.now() - 25000).toISOString(),
    citations: [
      { id: '3', messageId: '4', chunkId: 'c3', relevanceScore: 0.92, quote: 'Polymorphism cho phép override method...', documentName: 'slide_chuong2.pdf', pageNumber: 28 },
    ],
  },
];

const courses = [
  { id: '1', code: 'CS101', name: 'Nhập môn lập trình' },
  { id: '2', code: 'CS201', name: 'Cấu trúc dữ liệu' },
  { id: '3', code: 'CS301', name: 'Lập trình hướng đối tượng' },
];

export default function ChatPage() {
  const { user } = useAuth();
  const [conversations] = useState(mockConversations);
  const [activeConversation, setActiveConversation] = useState<string | null>('1');
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [inputValue, setInputValue] = useState('');
  const [selectedModel, setSelectedModel] = useState<string>('gpt-4');
  const [selectedCourse, setSelectedCourse] = useState<string>('3');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return;

    const newUserMessage: Message = {
      id: Date.now().toString(),
      conversationId: activeConversation || 'new',
      role: 'user',
      content: inputValue,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, newUserMessage]);
    setInputValue('');
    setIsTyping(true);

    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        conversationId: activeConversation || 'new',
        role: 'assistant',
        content: 'Đây là câu trả lời mẫu từ AI. Trong phiên bản thực, câu trả lời sẽ được tạo bởi RAG pipeline dựa trên tài liệu môn học đã upload.',
        tokensUsed: 50,
        modelUsed: selectedModel,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, aiResponse]);
      setIsTyping(false);
    }, 1500);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const currentCourse = courses.find((c) => c.id === selectedCourse);

  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <div className="w-72 border-r bg-card flex flex-col">
        <div className="p-4 border-b">
          <Button variant="gradient" className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Cuộc trò chuyện mới
          </Button>
        </div>

        <div className="p-4 border-b">
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="h-9">
              <BookOpen className="h-4 w-4 mr-2 text-primary" />
              <SelectValue placeholder="Chọn môn học" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((course) => (
                <SelectItem key={course.id} value={course.id}>
                  {course.code} - {course.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => setActiveConversation(conv.id)}
                className={cn(
                  'w-full p-3 rounded-lg text-left transition-all duration-200 group',
                  activeConversation === conv.id
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'hover:bg-secondary text-foreground border border-transparent'
                )}
              >
                <div className="flex items-start gap-3">
                  <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{conv.title}</p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.lastMessage}</p>
                  </div>
                  <button className="opacity-0 group-hover:opacity-100 p-1 hover:bg-destructive/10 rounded transition-all">
                    <Trash2 className="h-3 w-3 text-destructive" />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        {/* Chat Header */}
        <div className="h-14 border-b flex items-center justify-between px-6 bg-card/80 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <BookOpen className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold text-sm">{currentCourse?.name}</h2>
              <p className="text-xs text-muted-foreground">{currentCourse?.code}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Select value={selectedModel} onValueChange={setSelectedModel}>
              <SelectTrigger className="w-44 h-8 text-xs">
                <Sparkles className="h-3.5 w-3.5 mr-1.5 text-primary" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AVAILABLE_MODELS.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs">{model.name}</span>
                      <Badge variant="outline" className="ml-2 text-[10px] h-4">{model.cost}</Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6">
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Welcome message if no active conversation */}
            {!activeConversation && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="h-20 w-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 ai-glow">
                  <GraduationCap className="h-10 w-10 text-primary" />
                </div>
                <h2 className="text-2xl font-bold mb-2">Xin chào! Tôi là EduAssist AI</h2>
                <p className="text-muted-foreground max-w-sm mb-8">
                  Hãy hỏi tôi bất kỳ câu hỏi nào về môn học của bạn. Tôi sẽ trả lời dựa trên tài liệu đã được upload.
                </p>
                <div className="grid grid-cols-2 gap-3 max-w-md">
                  {['OOP là gì?', 'Giải thích tính kế thừa', 'Cho ví dụ đa hình', 'Tạo 5 câu quiz'].map((q) => (
                    <Button key={q} variant="outline" className="text-sm h-auto py-3 justify-start" onClick={() => setInputValue(q)}>
                      <Sparkles className="h-3.5 w-3.5 mr-2 text-primary shrink-0" />
                      {q}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((message) => (
              <div
                key={message.id}
                className={cn('flex gap-4 message-appear', message.role === 'user' ? 'flex-row-reverse' : '')}
              >
                <Avatar className="h-8 w-8 shrink-0">
                  {message.role === 'user' ? (
                    <>
                      <AvatarImage src={user?.avatarUrl} />
                      <AvatarFallback className="bg-primary text-primary-foreground text-xs">
                        {user?.fullName?.charAt(0)}
                      </AvatarFallback>
                    </>
                  ) : (
                    <AvatarFallback className="bg-accent text-accent-foreground">
                      <Bot className="h-4 w-4" />
                    </AvatarFallback>
                  )}
                </Avatar>

                <div className={cn('flex-1 space-y-2', message.role === 'user' ? 'text-right' : '')}>
                  <div
                    className={cn(
                      'inline-block rounded-2xl px-4 py-3 max-w-full text-sm',
                      message.role === 'user'
                        ? 'bg-chat-user text-chat-user-foreground rounded-tr-sm'
                        : 'bg-chat-assistant text-chat-assistant-foreground rounded-tl-sm'
                    )}
                  >
                    <div className="prose prose-sm max-w-none dark:prose-invert">
                      {message.role === 'assistant' ? (
                        <div
                          dangerouslySetInnerHTML={{
                            __html: message.content
                              .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                              .replace(/`([^`]+)`/g, '<code class="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">$1</code>')
                              .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre class="bg-sidebar text-sidebar-foreground p-3 rounded-lg text-xs overflow-x-auto my-3 font-mono"><code>$2</code></pre>')
                              .replace(/## (.*)/g, '<h3 class="font-semibold text-base mt-4 mb-2">$1</h3>')
                              .replace(/\n\n/g, '</p><p class="my-2">')
                              .replace(/\n(\d+\.)/g, '<br/>$1'),
                          }}
                        />
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>
                  </div>

                  {/* Citations */}
                  {message.citations && message.citations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2">
                      {message.citations.map((citation) => (
                        <button
                          key={citation.id}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-card border border-border hover:border-primary/30 text-xs text-muted-foreground transition-all hover:shadow-sm"
                        >
                          <FileText className="h-3 w-3 text-primary" />
                          <span className="font-medium">{citation.documentName}</span>
                          <span className="text-primary">tr.{citation.pageNumber}</span>
                          <Badge variant="outline" className="text-[10px] h-4 px-1">{Math.round(citation.relevanceScore * 100)}%</Badge>
                        </button>
                      ))}
                    </div>
                  )}

                  {message.modelUsed && (
                    <p className="text-[11px] text-muted-foreground/60">
                      {message.modelUsed} • {message.tokensUsed} tokens
                    </p>
                  )}
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex gap-4 message-appear">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-accent text-accent-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="bg-chat-assistant rounded-2xl rounded-tl-sm px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground" />
                    <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground" />
                    <span className="typing-dot h-2 w-2 rounded-full bg-muted-foreground" />
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Input Area */}
        <div className="border-t p-4 bg-card/80 backdrop-blur-sm">
          <div className="max-w-3xl mx-auto">
            <div className="flex items-center gap-2 p-2 rounded-xl bg-secondary/50 border focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary/30 transition-all">
              <Button variant="ghost" size="icon" className="shrink-0 h-8 w-8">
                <Paperclip className="h-4 w-4 text-muted-foreground" />
              </Button>
              <Input
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu hỏi của bạn..."
                className="border-0 bg-transparent focus-visible:ring-0 flex-1 h-8 text-sm"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isTyping}
                size="sm"
                className="shrink-0 h-8 px-3"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[11px] text-center text-muted-foreground/60 mt-2">
              AI có thể mắc lỗi. Hãy kiểm tra thông tin quan trọng từ nguồn tài liệu gốc.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
