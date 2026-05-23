import ecoloopSvg from '../assets/entrypagelogo/ecoloop.svg';

const EcoLoopLogo = ({ height = 44, dark = false, className = '' }) => {
  return (
    <img
      src={ecoloopSvg}
      alt="EcoLoop"
      style={{ height: `${height}px`, width: 'auto', display: 'block' }}
      className={className}
    />
  );
};

export default EcoLoopLogo;
