import { useParams } from 'react-router-dom';
import { SistemaOrcamentoMarmore } from '../SistemaOrcamentoMarmore';

export default function OrcamentoEditorPage() {
  const { id } = useParams();
  return <SistemaOrcamentoMarmore initialOrcamentoId={id} />;
}
