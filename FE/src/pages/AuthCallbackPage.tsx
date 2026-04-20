import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import * as authService from '@/services/authService';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, CheckCircle2, XCircle } from 'lucide-react';

export default function AuthCallbackPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get tokens from URL
        const accessToken = searchParams.get('access_token');
        const refreshToken = searchParams.get('refresh_token');
        const role = searchParams.get('role');

        if (!accessToken || !refreshToken) {
          throw new Error('Missing authentication tokens');
        }

        // Save tokens
        authService.setTokens(accessToken, refreshToken);

        // Get user profile
        const user = await authService.getCurrentUser();

        // Update auth context
        await refreshUser();

        setStatus('success');

        // Redirect based on role
        setTimeout(() => {
          if (user.role === 'admin') {
            navigate('/users');
          } else if (user.role === 'teacher') {
            navigate('/courses');
          } else {
            navigate('/dashboard');
          }
        }, 1000);

      } catch (error: any) {
        console.error('Auth callback error:', error);
        setStatus('error');
        setErrorMessage(error.message || 'Đăng nhập thất bại');

        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/login');
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate, refreshUser]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          {status === 'loading' && (
            <div className="text-center space-y-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary mx-auto" />
              <div>
                <h2 className="text-xl font-semibold mb-2">Đang xác thực...</h2>
                <p className="text-sm text-muted-foreground">
                  Vui lòng đợi trong giây lát
                </p>
              </div>
            </div>
          )}

          {status === 'success' && (
            <div className="text-center space-y-4">
              <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto" />
              <div>
                <h2 className="text-xl font-semibold mb-2">Đăng nhập thành công!</h2>
                <p className="text-sm text-muted-foreground">
                  Đang chuyển hướng...
                </p>
              </div>
            </div>
          )}

          {status === 'error' && (
            <div className="space-y-4">
              <div className="text-center">
                <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
                <h2 className="text-xl font-semibold mb-2">Đăng nhập thất bại</h2>
              </div>
              <Alert variant="destructive">
                <AlertDescription>{errorMessage}</AlertDescription>
              </Alert>
              <p className="text-sm text-muted-foreground text-center">
                Đang chuyển về trang đăng nhập...
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
