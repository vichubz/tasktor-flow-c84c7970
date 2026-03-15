import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import logoCompleto from "@/assets/logo_completo_tasktor.png";
import { toast } from "sonner";

const FloatingOrb = ({ size, color, delay, x, y }: { size: number; color: string; delay: number; x: string; y: string }) => (
  <div
    className="floating-orb"
    style={{
      width: size,
      height: size,
      background: color,
      left: x,
      top: y,
      animationDelay: `${delay}s`,
      opacity: 0.12,
    }}
  />
);

const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, signUp, user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) navigate("/home", { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        navigate("/home");
      }
    } else {
      if (inviteCode.toLowerCase() !== "ebss") {
        toast.error("Código de convite inválido.");
        setIsLoading(false);
        return;
      }
      const { error } = await signUp(email, password, name);
      if (error) {
        toast.error(error.message);
      } else {
        toast.success("Conta criada com sucesso!");
        navigate("/dashboard");
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center mesh-gradient relative overflow-hidden">
      {/* Floating orbs */}
      <FloatingOrb size={500} color="hsl(192 80% 35%)" delay={0} x="-15%" y="-25%" />
      <FloatingOrb size={350} color="hsl(172 66% 40%)" delay={2} x="65%" y="55%" />
      <FloatingOrb size={250} color="hsl(192 80% 45%)" delay={4} x="50%" y="-15%" />
      <FloatingOrb size={300} color="hsl(200 80% 25%)" delay={6} x="5%" y="65%" />

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.02]"
        style={{
          backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Radial glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/5 blur-[100px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-md px-6"
      >
        {/* Logo */}
        <motion.div
          className="text-center mb-10"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.15, duration: 0.5, ease: "easeOut" }}
        >
          <motion.div
            className="inline-flex items-center justify-center mb-3"
            whileHover={{ scale: 1.05 }}
          >
            <img src={logoCompleto} alt="Tasktor Produtividade" className="h-16 object-contain" />
          </motion.div>
          <p className="text-muted-foreground text-sm font-body">Produtividade premium para quem exige mais</p>
        </motion.div>

        {/* Card */}
        <motion.div
          className="glass rounded-2xl p-8 border border-primary/10 relative overflow-hidden"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          {/* Card ambient glow */}
          <div className="absolute -top-20 -right-20 w-40 h-40 rounded-full bg-primary/8 blur-[60px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-40 h-40 rounded-full bg-accent/8 blur-[60px] pointer-events-none" />

          {/* Toggle */}
          <div className="flex rounded-xl bg-secondary/80 p-1 mb-8 relative z-10">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold font-display transition-all duration-300 ${
                isLogin ? "gradient-primary text-primary-foreground glow-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-semibold font-display transition-all duration-300 ${
                !isLogin ? "gradient-primary text-primary-foreground glow-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Criar conta
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.form
              key={isLogin ? "login" : "signup"}
              initial={{ opacity: 0, x: isLogin ? -20 : 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: isLogin ? 20 : -20 }}
              transition={{ duration: 0.25 }}
              onSubmit={handleSubmit}
              className="space-y-5 relative z-10"
            >
              {!isLogin && (
                <>
                  <div className="input-glow rounded-lg transition-all">
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block font-display">Nome</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      className="bg-secondary/80 border-border/50 focus:border-primary focus:ring-primary/20 h-11"
                      required={!isLogin}
                    />
                  </div>
                  <div className="input-glow rounded-lg transition-all">
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block font-display">Código de convite</label>
                    <Input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Insira o código"
                      className="bg-secondary/80 border-border/50 focus:border-primary focus:ring-primary/20 h-11"
                      required={!isLogin}
                    />
                  </div>
                </>
              )}
              <div className="input-glow rounded-lg transition-all">
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block font-display">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-secondary/80 border-border/50 focus:border-primary focus:ring-primary/20 h-11"
                  required
                />
              </div>
              <div className="input-glow rounded-lg transition-all">
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block font-display">Senha</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-secondary/80 border-border/50 focus:border-primary focus:ring-primary/20 h-11"
                  required
                  minLength={6}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 gradient-primary text-primary-foreground font-semibold font-display btn-shimmer hover:opacity-90 transition-opacity glow-primary"
              >
                {isLoading ? (
                  <motion.span animate={{ opacity: [1, 0.5, 1] }} transition={{ duration: 1, repeat: Infinity }}>
                    Carregando...
                  </motion.span>
                ) : isLogin ? "Entrar" : "Criar conta"}
              </Button>
            </motion.form>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default AuthPage;