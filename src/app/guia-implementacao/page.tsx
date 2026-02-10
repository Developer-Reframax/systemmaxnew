/* eslint-disable react-refresh/only-export-components */
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Guia de Implementação do Systemmax'
}

export default function GuiaImplementacaoPage() {
  return (
    <main className="min-h-screen bg-slate-950 text-slate-100">
      <div className="relative isolate overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(20,184,166,0.25),_transparent_55%),radial-gradient(circle_at_20%_80%,_rgba(251,191,36,0.18),_transparent_60%),linear-gradient(120deg,_rgba(15,23,42,1)_0%,_rgba(2,6,23,1)_55%,_rgba(15,23,42,1)_100%)]" />
        <div className="absolute -top-24 right-10 h-72 w-72 rounded-full bg-teal-500/20 blur-[120px]" />
        <div className="absolute bottom-0 left-0 h-80 w-80 rounded-full bg-amber-400/15 blur-[140px]" />

        <div className="mx-auto max-w-6xl px-4 pb-20 pt-16 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs uppercase tracking-[0.28em] text-teal-200">
                Guia de Implementação
              </div>
              <h1 className="text-3xl font-semibold leading-tight text-white sm:text-4xl">
                GUIA DE IMPLEMENTAÇÃO DO SYSTEMMAX
              </h1>
              <p className="text-sm text-slate-300">
                Versão: 1.0
              </p>
              <p className="text-sm text-slate-300">
                Responsável: Equipe de TI / Desenvolvimento e SSO – Reframax Engenharia
              </p>
              <p className="text-sm text-slate-300">Sistema: Systemmax</p>
            </div>
            <div className="grid gap-3 text-right text-xs text-slate-300">
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                7 etapas essenciais para liberar o Systemmax em contrato/projeto
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                Página pública para consulta rápida
              </div>
            </div>
          </header>

          <section className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.45)] backdrop-blur">
              <h2 className="text-xs uppercase tracking-[0.3em] text-teal-200">1. OBJETIVO</h2>
              <p className="mt-4 text-base leading-relaxed text-slate-100">
                Estabelecer o passo a passo para a implantação do Systemmax (Módulos: Desvios e Inspeções),
                em contratos e projetos da Reframax, garantindo que todos os recursos, etapas e responsabilidades
                sejam cumpridos e definidos.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-white/10 via-white/5 to-transparent p-6">
              <h2 className="text-xs uppercase tracking-[0.3em] text-amber-200">Dúvidas</h2>
              <p className="mt-4 text-lg font-semibold text-white">📧 marciel.lima@reframax.com.br</p>
              <p className="mt-3 text-sm text-slate-300">
                Utilize este contato para dúvidas sobre o processo.
              </p>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-xs uppercase tracking-[0.3em] text-teal-200">2. RESPONSABILIDADES</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">Liderança local</h3>
                <p className="mt-3 text-sm text-slate-200">
                  Solicitar a implementação e providenciar os recursos físicos (Tablete ou computador dedicado
                  para o sistema e conectividade – internet de boa qualidade).
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">Equipe SESMT e Liderança local</h3>
                <p className="mt-3 text-sm text-slate-200">
                  Definir usuários administradores do sistema para devida parametrização e participar
                  integralmente dos treinamentos.
                </p>
                
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">Equipe de TI / Desenvolvimento</h3>
                <p className="mt-3 text-sm text-slate-200">
                  Realizar a implantação técnica, parametrização do módulo e treinamento dos usuários.
                </p>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">Liderança local</h3>
                
                
                <p className="mt-3 text-sm text-slate-200">
                  Promover o uso da ferramenta para as demais lideranças e operadores.
                </p>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-xs uppercase tracking-[0.3em] text-teal-200">3. REQUISITOS FÍSICOS E DE CONECTIVIDADE</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">3.1. Dispositivos Mínimos</h3>
                <p className="mt-3 text-sm text-slate-200">
                  Cada contrato/projeto deve adquirir os dispositivos de acordo com a demanda operacional,
                  considerando número de usuários e postos de trabalho.
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-200">
                  <li>Modelo homologado: Samsung Galaxy Tab A9 plus + 5G (já cadastrado no Fluig).</li>
                  <li>Acesso à internet: Obrigatório, podendo ser via Wi-Fi ou chip de dados.</li>
                  <li>
                    Uso de dispositivos pessoais:<br />
                    Recomenda-se que o contrato/projeto disponibilize dispositivos corporativos para os colaboradores.
                  </li>
                </ul>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">3.2. Conectividade</h3>
                <ul className="mt-4 space-y-2 text-sm text-slate-200">
                  <li>
                    Caso o dispositivo esteja fora do alcance Wi-Fi, solicitar chip de dados (Vivo – Claro )
                    da operadora com melhor sinal na região.
                  </li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-xs uppercase tracking-[0.3em] text-teal-200">4. SOLICITAÇÃO DE IMPLANTAÇÃO</h2>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-200">
                Após aquisição dos recursos necessários, a liderança do contrato/projeto deverá:
              </p>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-200">
                <li>
                  Enviar um e-mail para:<br />
                  marciel.lima@reframax.com.br solicitando a abertura do chamado.
                </li>
              </ol>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-xs uppercase tracking-[0.3em] text-teal-200">5. AGENDAMENTO E REALIZAÇÃO DO TREINAMENTO</h2>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">5.1. Agendamento</h3>
                <p className="mt-3 text-sm text-slate-200">
                  Após a abertura do chamado, a equipe de TI irá realizar os treinamentos e parametrização
                  conforme a programação da agenda corporativa.
                </p>
                <div className="mt-4 rounded-2xl border border-teal-400/20 bg-teal-500/10 p-4 text-sm text-teal-100">
                  Importante:<br />
                  Avaliar cuidadosamente a data solicitada, garantindo que todos os recursos físicos e participantes
                  estejam disponíveis.<br />
                  Evitar reagendamentos, pois estes podem causar conflito com outras demandas e atrasar o processo de implantação.
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-base font-semibold text-white">5.2. Público Obrigatório</h3>
                <p className="mt-3 text-sm text-slate-200">
                  A presença dos seguintes grupos é indispensável no treinamento:
                </p>
                <ul className="mt-4 space-y-2 text-sm text-slate-200">
                  <li>Equipe SESMT</li>
                  <li>Liderança local (encarregados, supervisores, etc.)</li>
                  <li>Administradores</li>
                </ul>
              </div>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-xs uppercase tracking-[0.3em] text-teal-200">6. PARAMETRIZAÇÃO E LIBERAÇÃO DO SISTEMA</h2>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <p className="text-sm text-slate-200">Após a conclusão do treinamento:</p>
              <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-slate-200">
                <li>Os módulos serão  parametrizados e liberados para uso pela equipe de TI.</li>
                <li>
                  Será enviado a liderança local um termo de implantação concluída, contendo:
                  <ul className="mt-3 list-disc space-y-2 pl-5">
                    <li>Data da implantação</li>
                    <li>Participantes do treinamento</li>
                    <li>Módulos ativos</li>
                    <li>Responsável técnico pela implantação</li>
                  </ul>
                </li>
              </ol>
            </div>
          </section>

          <section className="mt-10">
            <h2 className="text-xs uppercase tracking-[0.3em] text-teal-200">7. CONSIDERAÇÕES FINAIS</h2>
            <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-5">
              <ul className="space-y-2 text-sm text-slate-200">
                <li>
                  O sucesso da implantação depende da disponibilidade de recursos, da adesão dos usuários e da organização
                  prévia da equipe local.
                </li>
                <li>
                  A equipe de TI prioriza atendimentos de implantação, portanto, atrasos e cancelamentos sem aviso prévio
                  impactam diretamente o cronograma corporativo.
                </li>
                <li>
                  Recomenda-se que a gestão local mantenha um ponto focal para contato direto com Marciel (SSO), facilitando comunicações
                  e ajustes pós-implantação.
                </li>
              </ul>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
