import { useLanguage } from "../../context/LanguageContext";
import { IconType } from "react-icons";

export type SocialLink = {
  name: string;
  icon: IconType;
  url: string;
};

function Footer() {
  const { t } = useLanguage();

  return (
    <footer className="bg-card border-t border-card-border text-text transition-colors duration-300">   
      {/* Bottom */}
      <div className="border-t border-card py-4 text-center text-sm">
        {t("copyright")}
      </div>
    </footer>
  );
}

export default Footer;
