import ecoloopLight from '../assets/entrypagelogo/ecoloop.svg';
import ecoloopDark from '../assets/entrypagelogo/ecoloop-dark.svg';

const EcoLoopLogo = ({ height = 44, dark = false, className = '' }) => {
  return (
    <img
      src={dark ? ecoloopDark : ecoloopLight}
      alt="EcoLoop"
      style={{
        height: `${height}px`,
        width: 'auto',
        display: 'block',
      }}
      className={className}
    />
  );
};

export default EcoLoopLogo;
