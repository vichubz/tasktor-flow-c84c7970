export interface Quote {
  text: string;
  author: string;
}

const quotes: Quote[] = [
  // Business / Hustle
  { text: "A única maneira de fazer um ótimo trabalho é amar o que você faz.", author: "Steve Jobs" },
  { text: "Não tenha medo de desistir do bom para perseguir o ótimo.", author: "John D. Rockefeller" },
  { text: "Se você trabalha apenas por dinheiro, nunca vai conseguir. Mas se você ama o que faz, o sucesso será seu.", author: "Ray Kroc" },
  { text: "O maior risco é não correr nenhum risco.", author: "Mark Zuckerberg" },
  { text: "Seus clientes mais insatisfeitos são sua maior fonte de aprendizado.", author: "Bill Gates" },
  { text: "Quando algo é importante o suficiente, você faz mesmo que as chances não estejam a seu favor.", author: "Elon Musk" },
  { text: "Invente a si mesmo e depois reinvente a si mesmo.", author: "Jeff Bezos" },
  { text: "Ideias são mercadorias. Execução não é.", author: "Gary Vaynerchuk" },
  { text: "Não é sobre ter tempo. É sobre fazer tempo.", author: "Gary Vaynerchuk" },
  { text: "O sucesso geralmente vem para quem está ocupado demais para procurá-lo.", author: "Henry David Thoreau" },

  // Peaky Blinders
  { text: "Grande engole pequeno. Essa é a lei da selva.", author: "Tommy Shelby — Peaky Blinders" },
  { text: "Todo mundo é vendedor, Grace. Só vendemos partes diferentes de nós mesmos.", author: "Tommy Shelby — Peaky Blinders" },
  { text: "Eu não pago por trajes. E não pago pela guerra.", author: "Tommy Shelby — Peaky Blinders" },
  { text: "Já há algum tempo eu não preciso de razões. Eu preciso de resultados.", author: "Tommy Shelby — Peaky Blinders" },
  { text: "Homens fortes não precisam ser cruéis. Homens fracos não sabem ser outra coisa.", author: "Thomas Shelby — Peaky Blinders" },

  // Iron Man / Tony Stark
  { text: "Às vezes você precisa correr antes de aprender a andar.", author: "Tony Stark — Homem de Ferro" },
  { text: "Eu sou o Homem de Ferro.", author: "Tony Stark — Vingadores" },
  { text: "Heróis são feitos pelos caminhos que escolhem, não pelos poderes com que nascem.", author: "Tony Stark — Homem de Ferro" },
  { text: "Parte da jornada é o fim.", author: "Tony Stark — Vingadores: Ultimato" },

  // Monsters Inc.
  { text: "Ponha aquela coisa horrível de volta onde ela estava, ou Deus me ajude!", author: "Mike Wazowski — Monstros S.A." },
  { text: "Eu não teria nada se não tivesse você.", author: "Mike Wazowski — Monstros S.A." },
  { text: "Ela não é mais perigosa do que você quando não toma café.", author: "Mike Wazowski — Monstros S.A." },

  // Minecraft
  { text: "O único limite é a sua imaginação.", author: "Minecraft" },
  { text: "Sobreviva à noite. Construa durante o dia. Nunca pare de criar.", author: "Minecraft" },

  // Breaking Bad
  { text: "Eu sou aquele que bate na porta.", author: "Walter White — Breaking Bad" },
  { text: "Dizer meu nome não é uma ameaça. É um fato.", author: "Walter White — Breaking Bad" },

  // The Wolf of Wall Street
  { text: "A única coisa entre você e seu objetivo é a história que você conta a si mesmo.", author: "Jordan Belfort — O Lobo de Wall Street" },
  { text: "Deixe-me te dizer uma coisa: não existe nobreza na pobreza.", author: "Jordan Belfort — O Lobo de Wall Street" },

  // Suits
  { text: "Ganhar não é tudo, é a única coisa.", author: "Harvey Specter — Suits" },
  { text: "Trabalhe até seus ídolos se tornarem seus rivais.", author: "Harvey Specter — Suits" },
  { text: "Não tenho sonhos. Tenho metas.", author: "Harvey Specter — Suits" },

  // Rocky
  { text: "Não importa o quanto você bate, mas sim o quanto aguenta apanhar e continuar.", author: "Rocky Balboa" },

  // Outros
  { text: "Disciplina é escolher entre o que você quer agora e o que você mais quer.", author: "Abraham Lincoln" },
  { text: "O futuro pertence àqueles que acreditam na beleza de seus sonhos.", author: "Eleanor Roosevelt" },
  { text: "Feito é melhor que perfeito.", author: "Sheryl Sandberg" },
];

export function getDailyQuote(): Quote {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return quotes[dayOfYear % quotes.length];
}

export function getRandomQuote(excludeText?: string): Quote {
  const filtered = excludeText ? quotes.filter(q => q.text !== excludeText) : quotes;
  return filtered[Math.floor(Math.random() * filtered.length)];
}
