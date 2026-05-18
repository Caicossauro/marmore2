import { useState, useRef, useEffect } from 'react';
import { calcularSnap } from '../../../utils/cutting/snapMagnetismo';
import { temColisao as calcTemColisao, foraDosLimites as calcForaDosLimites } from '../../../utils/cutting/colisaoChapa';

const CANVAS_OFFSET = 50;

export function useDragPecaChapa({
  chapa,
  canvasRef,
  todasChapas,
  escala,
  espessuraDisco,
  margemLaterais,
  onMoverPeca,
  onMoverPecaNaChapa,
  onMoverParaAvulsas,
  onDragPreviewChange,
}) {
  const [arrastandoPeca, setArrastandoPeca] = useState(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [pecaSelecionada, setPecaSelecionada] = useState(null);
  const [pecaHover, setPecaHover] = useState(null);
  const [mouseForaDoCanvas, setMouseForaDoCanvas] = useState(false);
  // Ref espelho para acessar o valor atual dentro de listeners globais (sem re-registrar)
  const mouseForaDoCanvasRef = useRef(false);

  // Durante drag: atualiza preview flutuante e processa drop em outra chapa no mouseup.
  useEffect(() => {
    if (!arrastandoPeca) return;

    const detectarChapaAlvo = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const alvo = el?.closest('[data-chapa-id]');
      return alvo?.getAttribute('data-chapa-id') || null;
    };

    const handleGlobalMove = (e) => {
      // Preview flutuante só quando mouse está FORA do canvas de origem
      // (dentro, o fantasma do canvas já mostra a peça com magnetismo).
      if (!mouseForaDoCanvasRef.current) {
        onDragPreviewChange?.(null);
        return;
      }
      onDragPreviewChange?.({
        peca: arrastandoPeca,
        chapaOrigemId: chapa.id,
        escala,
        clientX: e.clientX,
        clientY: e.clientY,
      });
    };

    const handleGlobalUp = (e) => {
      const chapaAlvoId = detectarChapaAlvo(e);
      const targetIsCanvas = e.target?.tagName === 'CANVAS';

      // Mesmo card + direto no canvas: deixa handleMouseUp local processar (valida posição/colisão)
      if (chapaAlvoId === String(chapa.id) && targetIsCanvas) {
        onDragPreviewChange?.(null);
        return;
      }

      // Mesmo card + fora do canvas: cancelar drag
      if (chapaAlvoId === String(chapa.id)) {
        setArrastandoPeca(null);
        onDragPreviewChange?.(null);
        return;
      }

      // Bandeja de peças avulsas: voltar peça para lá
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const bandeja = el?.closest('[data-destino-avulsas]');
      if (bandeja && onMoverParaAvulsas) {
        onMoverParaAvulsas(arrastandoPeca.id);
        setArrastandoPeca(null);
        onDragPreviewChange?.(null);
        return;
      }

      // Outra chapa: validar material e mover
      if (chapaAlvoId) {
        const chapaAlvo = (todasChapas || []).find((c) => String(c.id) === chapaAlvoId);
        if (chapaAlvo && chapaAlvo.materialId === chapa.materialId) {
          onMoverPeca(arrastandoPeca.id, chapaAlvo.id);
        } else if (chapaAlvo) {
          alert('⚠️ Só é possível mover peças entre chapas do mesmo material.');
        }
      }
      setArrastandoPeca(null);
      onDragPreviewChange?.(null);
    };

    window.addEventListener('mousemove', handleGlobalMove);
    window.addEventListener('mouseup', handleGlobalUp);
    return () => {
      window.removeEventListener('mousemove', handleGlobalMove);
      window.removeEventListener('mouseup', handleGlobalUp);
    };
  }, [arrastandoPeca, chapa.id, chapa.materialId, escala, todasChapas, onMoverPeca, onMoverParaAvulsas, onDragPreviewChange]);

  const onMouseDown = (e) => {
    if (e.button !== 0) return; // só processar clique esquerdo
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pecaClicada = chapa.pecas.find((peca) => {
      const px = CANVAS_OFFSET + peca.posX * escala;
      const py = CANVAS_OFFSET + peca.posY * escala;
      const pw = (peca.rotacao === 90 ? peca.altura : peca.largura) * escala;
      const ph = (peca.rotacao === 90 ? peca.largura : peca.altura) * escala;
      return x >= px && x <= px + pw && y >= py && y <= py + ph;
    });

    if (pecaClicada) {
      setPecaSelecionada(pecaClicada.id);
      setPecaHover(null);
      setMouseForaDoCanvas(false);
      mouseForaDoCanvasRef.current = false;
      const px = CANVAS_OFFSET + pecaClicada.posX * escala;
      const py = CANVAS_OFFSET + pecaClicada.posY * escala;
      setOffset({ x: x - px, y: y - py });
      setArrastandoPeca({ ...pecaClicada, x: px, y: py });
    } else {
      setPecaSelecionada(null);
    }
  };

  const onMouseMove = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (!arrastandoPeca) {
      const pecaSobMouse = chapa.pecas.find((peca) => {
        const px = CANVAS_OFFSET + peca.posX * escala;
        const py = CANVAS_OFFSET + peca.posY * escala;
        const pw = (peca.rotacao === 90 ? peca.altura : peca.largura) * escala;
        const ph = (peca.rotacao === 90 ? peca.largura : peca.altura) * escala;
        return mouseX >= px && mouseX <= px + pw && mouseY >= py && mouseY <= py + ph;
      });
      if (pecaSobMouse) {
        setPecaHover({ id: pecaSobMouse.id, mouseX, mouseY });
      } else {
        setPecaHover(null);
      }
      return;
    }

    const x = mouseX - offset.x;
    const y = mouseY - offset.y;

    let novaX = Math.max(0, (x - CANVAS_OFFSET) / escala);
    let novaY = Math.max(0, (y - CANVAS_OFFSET) / escala);
    const espacamento = espessuraDisco;

    const resultado = calcularSnap({
      origX: novaX,
      origY: novaY,
      peca: arrastandoPeca,
      outrasPecas: chapa.pecas,
      chapa,
      espessuraDisco,
      margemLaterais,
    });
    novaX = resultado.novaX;
    novaY = resultado.novaY;

    const colisao = calcTemColisao({ peca: arrastandoPeca, outras: chapa.pecas, espacamento, novaX, novaY });
    const fora    = calcForaDosLimites({ peca: arrastandoPeca, chapa, margemLaterais, novaX, novaY });

    setArrastandoPeca({
      ...arrastandoPeca,
      x: CANVAS_OFFSET + novaX * escala,
      y: CANVAS_OFFSET + novaY * escala,
      posXReal: novaX,
      posYReal: novaY,
      colisao: colisao || fora,
    });
  };

  const onMouseLeave = () => {
    setPecaHover(null);
    // NÃO cancela arrastandoPeca: permite arrastar para fora e soltar em outra chapa
    // (drop é tratado no listener global de mouseup).
    // Esconder fantasma para não ficar preso na borda nem mostrar "COLISÃO" falso.
    if (arrastandoPeca) {
      setMouseForaDoCanvas(true);
      mouseForaDoCanvasRef.current = true;
    }
  };

  const onMouseEnter = () => {
    setMouseForaDoCanvas(false);
    mouseForaDoCanvasRef.current = false;
  };

  const onMouseUp = () => {
    if (!arrastandoPeca) return;

    // Arredonda para inteiros (mm) pra evitar erros de floating-point nas comparações
    const novaX = Math.round(
      arrastandoPeca.posXReal !== undefined
        ? arrastandoPeca.posXReal
        : Math.max(0, (arrastandoPeca.x - CANVAS_OFFSET) / escala)
    );
    const novaY = Math.round(
      arrastandoPeca.posYReal !== undefined
        ? arrastandoPeca.posYReal
        : Math.max(0, (arrastandoPeca.y - CANVAS_OFFSET) / escala)
    );

    const espacamento = espessuraDisco;

    if (calcForaDosLimites({ peca: arrastandoPeca, chapa, margemLaterais, novaX, novaY })) {
      alert('A peça não cabe nesta posição! Verifique os limites da chapa.');
      setArrastandoPeca(null);
      return;
    }

    // Colisão via AABB com bordas infladas pelo espaçamento (gap mínimo exigido).
    // Se alguma borda ficar a menos que `espacamento`mm com sobreposição no eixo perpendicular,
    // as bboxes infladas se sobrepõem → colisão.
    if (calcTemColisao({ peca: arrastandoPeca, outras: chapa.pecas, espacamento, novaX, novaY })) {
      alert(
        `Não é possível posicionar a peça aqui! Ela precisa estar a pelo menos ${espessuraDisco}mm de distância das outras peças (espessura do disco de corte).`
      );
      setArrastandoPeca(null);
      return;
    }

    onMoverPecaNaChapa(arrastandoPeca.id, chapa.id, novaX, novaY);
    setArrastandoPeca(null);
  };

  const onContextMenu = (e, setMenuContexto) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const pecaClicada = chapa.pecas.find((peca) => {
      const px = CANVAS_OFFSET + peca.posX * escala;
      const py = CANVAS_OFFSET + peca.posY * escala;
      const pw = (peca.rotacao === 90 ? peca.altura : peca.largura) * escala;
      const ph = (peca.rotacao === 90 ? peca.largura : peca.altura) * escala;
      return x >= px && x <= px + pw && y >= py && y <= py + ph;
    });
    if (!pecaClicada) return;

    setPecaSelecionada(pecaClicada.id);
    setMenuContexto({ x: e.clientX, y: e.clientY, peca: pecaClicada });
  };

  return {
    arrastandoPeca,
    pecaSelecionada,
    pecaHover,
    mouseForaDoCanvas,
    handlers: { onMouseDown, onMouseMove, onMouseUp, onMouseEnter, onMouseLeave, onContextMenu },
  };
}
