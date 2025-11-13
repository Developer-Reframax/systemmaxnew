import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { verifyJWTToken } from '@/lib/jwt-middleware';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

interface ValidateStockRequest {
  items: {
    item_id: string;
    quantidade: number;
  }[];
}

interface StockValidation {
  item_id: string;
  available: boolean;
  current_stock: number;
  requested_quantity: number;
}

// POST /api/almoxarifado/itens/validate-stock - Validar estoque de itens
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação
    const authResult = await verifyJWTToken(request);
    if (!authResult.success) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body: ValidateStockRequest = await request.json();
    const { items } = body;

    // Validar campos obrigatórios
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ 
        error: 'Lista de itens é obrigatória' 
      }, { status: 400 });
    }

    // Validar estrutura dos itens
    for (const item of items) {
      if (!item.item_id || typeof item.quantidade !== 'number' || item.quantidade <= 0) {
        return NextResponse.json({ 
          error: 'Cada item deve ter item_id e quantidade válidos' 
        }, { status: 400 });
      }
    }

    // Buscar informações de estoque dos itens
    const itemIds = items.map(item => item.item_id);
    
    const { data: itensEstoque, error: estoqueError } = await supabase
      .from('itens_almoxarifado')
      .select('id, nome, estoque_atual, ativo')
      .in('id', itemIds);

    if (estoqueError) {
      console.error('Erro ao buscar estoque:', estoqueError);
      return NextResponse.json({ 
        error: 'Erro interno do servidor' 
      }, { status: 500 });
    }

    // Validar estoque para cada item
    const validations: StockValidation[] = items.map(requestItem => {
      const itemEstoque = itensEstoque?.find(item => item.id === requestItem.item_id);
      
      if (!itemEstoque) {
        return {
          item_id: requestItem.item_id,
          available: false,
          current_stock: 0,
          requested_quantity: requestItem.quantidade
        };
      }

      if (!itemEstoque.ativo) {
        return {
          item_id: requestItem.item_id,
          available: false,
          current_stock: itemEstoque.estoque_atual,
          requested_quantity: requestItem.quantidade
        };
      }

      const available = itemEstoque.estoque_atual >= requestItem.quantidade;

      return {
        item_id: requestItem.item_id,
        available,
        current_stock: itemEstoque.estoque_atual,
        requested_quantity: requestItem.quantidade
      };
    });

    return NextResponse.json({
      success: true,
      validations
    });

  } catch (error) {
    console.error('Erro ao validar estoque:', error);
    return NextResponse.json({ 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}