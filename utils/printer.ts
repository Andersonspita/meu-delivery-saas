// IMPORTA O NOSSO ARQUIVO LOCAL (Não use mais o import da biblioteca)
import { EscPosEncoder } from './EscPosEncoder';

export const connectToPrinter = async () => {
  try {
    console.log('Iniciando busca Bluetooth...');
    
    const OPTIONAL_SERVICES = [
      '000018f0-0000-1000-8000-00805f9b34fb',
      'e7810a71-73ae-499d-8c15-faa9aef0c3f2',
      '0000ff00-0000-1000-8000-00805f9b34fb',
      '49535343-fe7d-4ae5-8fa9-9fafd205e455'
    ];

    const device = await (navigator as any).bluetooth.requestDevice({
      acceptAllDevices: true,
      optionalServices: OPTIONAL_SERVICES
    });

    console.log('Dispositivo escolhido:', device.name);
    const server = await device.gatt.connect();
    
    let service;
    let characteristic;

    for (const serviceUUID of OPTIONAL_SERVICES) {
      try {
        service = await server.getPrimaryService(serviceUUID);
        const CHAR_UUIDS = [
            '00002af1-0000-1000-8000-00805f9b34fb', 
            '0000ff02-0000-1000-8000-00805f9b34fb',
            '49535343-8841-43f4-a8d4-ecbe34729bb3'
        ];

        for (const charUUID of CHAR_UUIDS) {
            try {
                characteristic = await service.getCharacteristic(charUUID);
                if (characteristic) break;
            } catch (e) { continue; }
        }
        if (characteristic) break; 
      } catch (e) { continue; }
    }

    if (!characteristic) {
      alert('Erro: Não foi possível encontrar o canal de impressão.');
      return null;
    }

    return { device, characteristic };
  } catch (error) {
    console.error('Erro ao conectar:', error);
    alert('Não foi possível conectar. Verifique Bluetooth/Bluefy.');
    return null;
  }
};

export const printOrder = async (characteristic: any, order: any) => {
  // USA A NOSSA CLASSE NOVA
  const encoder = new EscPosEncoder();

  let receipt = encoder
    .initialize()
    .codepage('cp860')
    .align('center')
    .bold(true)
    .line(order.pizzaria_name || 'PIZZARIA')
    .bold(false)
    .line('--------------------------------')
    .align('left')
    .line(`PEDIDO: #${order.order_number}`)
    .line(`CLIENTE: ${order.customer_name}`)
    .line(`TEL: ${order.customer_phone}`)
    .line('--------------------------------')
    .bold(true)
    .line('ITENS:')
    .bold(false);

  order.order_items_json.forEach((item: any) => {
    receipt
      .line(`- ${item.name}`)
      .line(`  Tam: ${item.size} | R$ ${item.price.toFixed(2)}`);
    
    if (item.flavors && item.flavors.length > 0) {
      receipt.line(`  + ${item.flavors.join(', ')}`);
    }
    
    if (item.observation) {
      receipt.bold(true).line(`  OBS: ${item.observation}`).bold(false);
    }
    receipt.line('');
  });

  receipt
    .line('--------------------------------')
    .align('right')
    .bold(true)
    .line(`TOTAL: R$ ${order.total_amount.toFixed(2)}`)
    .bold(false)
    .align('center')
    .line('--------------------------------')
    .line(order.delivery_address)
    .line('')
    .line(order.payment_method.toUpperCase())
    .encode(); // Retorna o array de bytes pronto

  const data = receipt;
  const CHUNK_SIZE = 100;
  
  for (let i = 0; i < data.length; i += CHUNK_SIZE) {
    const chunk = data.slice(i, i + CHUNK_SIZE);
    await characteristic.writeValue(chunk);
    await new Promise(resolve => setTimeout(resolve, 50)); 
  }
};