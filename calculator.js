/**
 * De Mãe para Filha - Módulo de Cálculos e Precificação (calculator.js)
 * Contém a lógica de precificação de insumos e receitas.
 */

// Objeto global de cálculos exposto para o app.js
const ConfeitariaCalculadora = {
    /**
     * Calcula o custo de uma determinada quantidade de um ingrediente (insumo).
     * @param {Object} insumo - O objeto de ingrediente.
     * @param {number} qtdUsada - A quantidade usada do ingrediente na receita.
     * @returns {number} O custo proporcional do ingrediente.
     */
    calcularCustoInsumo(insumo, qtdUsada) {
        if (!insumo || !insumo.tamanho || !insumo.preco || !qtdUsada) return 0;
        
        // Trata conversão implícita de Kg para g e L para ml caso necessário
        // Exemplo: se o insumo está em kg e a receita usa em g, ou vice-versa.
        // Mas a UI facilitará manter a mesma unidade do cadastro.
        const precoUnitario = insumo.preco / insumo.tamanho;
        return precoUnitario * qtdUsada;
    },

    /**
     * Calcula o custo total de ingredientes em uma receita.
     * @param {Object} receita - O objeto de receita.
     * @param {Array} todosInsumos - A lista completa de insumos cadastrados no sistema.
     * @returns {number} O custo de todos os ingredientes somados.
     */
    calcularCustoInsumosReceita(receita, todosInsumos) {
        if (!receita || !receita.ingredientes || !Array.isArray(receita.ingredientes)) return 0;
        
        let custoInsumos = 0;
        
        receita.ingredientes.forEach(item => {
            const insumo = todosInsumos.find(i => i.id === item.insumoId);
            if (insumo) {
                custoInsumos += this.calcularCustoInsumo(insumo, item.quantidade);
            }
        });
        
        return custoInsumos;
    },

    /**
     * Calcula o custo total de produção da receita (Ingredientes + Custos Adicionais).
     * @param {Object} receita - O objeto de receita.
     * @param {Array} todosInsumos - A lista completa de insumos.
     * @returns {number} Custo total.
     */
    calcularCustoTotal(receita, todosInsumos) {
        const custoInsumos = this.calcularCustoInsumosReceita(receita, todosInsumos);
        const adicionais = parseFloat(receita.custosAdicionais) || 0;
        return custoInsumos + adicionais;
    },

    /**
     * Calcula o custo unitário (por porção) da receita.
     * @param {Object} receita - A receita.
     * @param {Array} todosInsumos - Lista de insumos.
     * @returns {number} Custo por porção.
     */
    calcularCustoUnitario(receita, todosInsumos) {
        const custoTotal = this.calcularCustoTotal(receita, todosInsumos);
        const rendimento = parseInt(receita.rendimento) || 1;
        return custoTotal / rendimento;
    },

    /**
     * Calcula o preço de venda sugerido total para a receita com base na margem de lucro.
     * @param {Object} receita - A receita.
     * @param {Array} todosInsumos - Lista de insumos.
     * @returns {number} Preço sugerido total.
     */
    calcularPrecoVendaSugerido(receita, todosInsumos) {
        const custoTotal = this.calcularCustoTotal(receita, todosInsumos);
        const margem = parseFloat(receita.margem) || 0;
        // Margem de lucro de 100% significa dobrar o preço: Custo + Custo * 100%
        return custoTotal * (1 + (margem / 100));
    },

    /**
     * Calcula o preço de venda unitário sugerido para a receita.
     * @param {Object} receita - A receita.
     * @param {Array} todosInsumos - Lista de insumos.
     * @returns {number} Preço sugerido unitário.
     */
    calcularPrecoVendaUnitarioSugerido(receita, todosInsumos) {
        const precoVendaSugerido = this.calcularPrecoVendaSugerido(receita, todosInsumos);
        const rendimento = parseInt(receita.rendimento) || 1;
        return precoVendaSugerido / rendimento;
    }
};
