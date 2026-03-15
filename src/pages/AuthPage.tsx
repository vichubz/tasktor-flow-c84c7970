import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
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
      opacity: 0.15,
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
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    if (isLogin) {
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        navigate("/");
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
        navigate("/");
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background relative overflow-hidden">
      {/* Floating orbs */}
      <FloatingOrb size={400} color="hsl(263 70% 58%)" delay={0} x="-10%" y="-20%" />
      <FloatingOrb size={300} color="hsl(187 92% 42%)" delay={2} x="70%" y="60%" />
      <FloatingOrb size={200} color="hsl(160 60% 45%)" delay={4} x="50%" y="-10%" />
      <FloatingOrb size={250} color="hsl(263 70% 58%)" delay={6} x="10%" y="70%" />

      {/* Grid overlay */}
      <div className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

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
            className="inline-flex items-center gap-3 mb-3"
            whileHover={{ scale: 1.05 }}
          >
            <div className="w-12 h-12 rounded-xl gradient-primary flex items-center justify-center glow-primary">
              <Zap className="w-6 h-6 text-primary-foreground" />
            </div>
            <h1 className="text-4xl font-bold text-foreground text-tight neon-text-primary">Tasktor</h1>
          </motion.div>
          <p className="text-muted-foreground text-sm">Produtividade premium para quem exige mais</p>
        </motion.div>

        {/* Card */}
        <motion.div 
          className="glass rounded-2xl p-8 border border-border/50"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.5 }}
        >
          {/* Toggle */}
          <div className="flex rounded-xl bg-secondary p-1 mb-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                isLogin ? "bg-primary text-primary-foreground glow-primary" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Entrar
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all duration-300 ${
                !isLogin ? "bg-primary text-primary-foreground glow-primary" : "text-muted-foreground hover:text-foreground"
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
              className="space-y-5"
            >
              {!isLogin && (
                <>
                  <div className="input-glow rounded-lg transition-all">
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Nome</label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Seu nome"
                      className="bg-secondary border-border focus:border-primary focus:ring-primary/20 h-11"
                      required={!isLogin}
                    />
                  </div>
                  <div className="input-glow rounded-lg transition-all">
                    <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Código de convite</label>
                    <Input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Insira o código"
                      className="bg-secondary border-border focus:border-primary focus:ring-primary/20 h-11"
                      required={!isLogin}
                    />
                  </div>
                </>
              )}
              <div className="input-glow rounded-lg transition-all">
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Email</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="bg-secondary border-border focus:border-primary focus:ring-primary/20 h-11"
                  required
                />
              </div>
              <div className="input-glow rounded-lg transition-all">
                <label className="text-sm font-medium text-muted-foreground mb-1.5 block">Senha</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-secondary border-border focus:border-primary focus:ring-primary/20 h-11"
                  required
                  minLength={6}
                />
              </div>
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-11 gradient-primary text-primary-foreground font-semibold btn-shimmer hover:opacity-90 transition-opacity"
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
