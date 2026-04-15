import ecoloopPng from '../../assets/entrypagelogo/ecoloop.png';

const EcoLoopLogo = ({ height = 44, dark = false, className = '' }) => {
  return (
    <img
      src={ecoloopPng}
      alt="EcoLoop"
      style={{ height: `${height}px`, width: 'auto', display: 'block' }}
      className={className}
    />
  );
};

export default EcoLoopLogo;
