import { useNavigate } from 'react-router-dom';
import ReportWasteModal from '../../shared/components/ReportWasteModal';
import { useTheme } from '../../shared/context/ThemeContext';

const ReportWastePage = () => {
  const navigate = useNavigate();
  const { dark } = useTheme();

  return (
    <ReportWasteModal
      isOpen={true}
      onClose={() => navigate(-1)}
      onSuccess={() => navigate('/citizen/my-reports')}
      dark={dark}
    />
  );
};

export default ReportWastePage;
