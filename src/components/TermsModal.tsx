'use client'

import React from 'react'
import { X } from 'lucide-react'

interface TermsModalProps {
  isOpen: boolean
  onAccept: () => void
  onDecline: () => void
}

const TERMS_TEXT = `Este documento estabelece os termos e condições de uso do software SystemMax, de propriedade da REFRAMAX, desenvolvido exclusivamente para a gestão interna e otimização de processos empresariais. Ao utilizar o software, o colaborador concorda integralmente com os termos aqui dispostos, sendo obrigatória sua leitura e aceitação.

1. Propriedade Intelectual
O SystemMax é uma solução proprietária da REFRAMAX, protegido por leis de direitos autorais (Lei nº 9.610/98) e outras normas aplicáveis à propriedade intelectual. Nenhuma parte do software pode ser copiada, distribuída, ou usada fora do escopo permitido sem a expressa autorização da empresa.

2. Licença de Uso
O uso do SystemMax é estritamente limitado ao ambiente empresarial interno da REFRAMAX, sendo vedada sua utilização para fins pessoais ou externos à empresa. Esta licença é de caráter intransferível e não exclusivo, conforme disposto no art. 9º da Lei do Software (Lei nº 9.609/98).

3. Acesso e Restrição
Todos os dados processados e armazenados no SystemMax são confidenciais e de propriedade da REFRAMAX, conforme os princípios estabelecidos na Lei Geral de Proteção de Dados (Lei nº 13.709/18). É terminantemente proibida a divulgação de qualquer dado, informação ou material resultante do uso do software para partes externas sem autorização prévia e por escrito da empresa.

4. Segurança e Confidencialidade
O SystemMax adere a rigorosos padrões de segurança da informação e confidencialidade, garantindo a integridade e a proteção dos dados empresariais. A empresa segue as diretrizes da LGPD (Lei Geral de Proteção de Dados) e demais legislações aplicáveis, assegurando que as informações sensíveis sejam tratadas com a devida cautela.

5. Suporte e Manutenção
A REFRAMAX oferece suporte técnico completo e contínuo para o SystemMax, garantindo seu funcionamento adequado e a implementação de atualizações necessárias para melhorias e correções de possíveis falhas, em conformidade com as melhores práticas de manutenção de software.

6. Limitação de Responsabilidade
A REFRAMAX não se responsabiliza por qualquer prejuízo, direto ou indireto, decorrente do uso inadequado do SystemMax ou da violação destes termos. O uso do software deve ser conduzido de acordo com as finalidades para as quais foi desenvolvido, sendo o colaborador responsável por qualquer dano causado por mau uso ou desvio das funcionalidades.

7. Alterações nos Termos
A REFRAMAX reserva-se o direito de alterar os presentes termos e condições a qualquer momento. Qualquer mudança será previamente informada aos usuários. O uso contínuo do SystemMax após a comunicação dessas alterações implicará na aceitação automática dos novos termos.

8. Rescisão de Uso
A utilização do SystemMax pode ser suspensa ou encerrada pela REFRAMAX em caso de violação destes termos, condutas inadequadas ou por decisão da empresa, sem que haja necessidade de notificação prévia.

9. Contato por WhatsApp
O colaborador autoriza expressamente a REFRAMAX a contatá-lo via WhatsApp em ocasiões que se fizerem necessárias para assuntos relacionados ao uso do SystemMax ou comunicações sobre o suporte técnico do software, conforme regulamentado pelo Código de Defesa do Consumidor (Lei nº 8.078/90).`

export default function TermsModal({ isOpen, onAccept, onDecline }: TermsModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-blue-600">Termos de Uso</h2>
          <button
            onClick={onDecline}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            aria-label="Fechar"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-line text-gray-700 leading-relaxed">
              {TERMS_TEXT}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-4 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onDecline}
            className="px-6 py-2 text-gray-600 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            Recusar
          </button>
          <button
            onClick={onAccept}
            className="px-6 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium transition-colors"
          >
            Aceitar
          </button>
        </div>
      </div>
    </div>
  )
}
