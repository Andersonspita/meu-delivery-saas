export class EscPosEncoder {
  private buffer: number[] = [];

  constructor() {
    this.initialize();
  }

  initialize() {
    this.buffer = [0x1b, 0x40]; // ESC @ (Inicializa)
    return this;
  }

  codepage(page: string) {
    // Para simplificar, vamos focar no padrão ocidental.
    // Muitas impressoras usam CP850 ou CP860 para Brasil.
    // ESC t n
    this.buffer.push(0x1b, 0x74, 0x03); // Tenta CP860 (Português)
    return this;
  }

  align(alignment: 'left' | 'center' | 'right') {
    let value = 0x00;
    if (alignment === 'center') value = 0x01;
    if (alignment === 'right') value = 0x02;
    this.buffer.push(0x1b, 0x61, value); // ESC a n
    return this;
  }

  bold(active: boolean) {
    this.buffer.push(0x1b, 0x45, active ? 0x01 : 0x00); // ESC E n
    return this;
  }

  line(text: string) {
    // Converte string para bytes (TextEncoder resolve acentos UTF-8 para impressoras modernas)
    // Para impressoras antigas, teríamos que converter para CP850 manualmente.
    // Vamos usar uma abordagem hibrida simples:
    
    // 1. Remove acentos para garantir compatibilidade universal (opção segura)
    const cleanText = text.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    for (let i = 0; i < cleanText.length; i++) {
      this.buffer.push(cleanText.charCodeAt(i));
    }
    this.buffer.push(0x0a); // LF (Quebra de linha)
    return this;
  }

  encode(): Uint8Array {
    // Comandos finais para cortar papel ou avançar
    this.buffer.push(0x0a, 0x0a, 0x0a); 
    return new Uint8Array(this.buffer);
  }
}