import { IconType } from "react-icons";

export type SocialLink = {
  name: string;
  icon: IconType;
  url: string;
};

function Footer() {
  return (
    <footer className="bg-card border-t border-card-border text-text transition-colors duration-300">   
      {/* Bottom */}
      <div className="border-t border-card py-4 text-center text-sm">
        © {new Date().getFullYear()} Mortgage CRM. All rights reserved.
      </div>
    </footer>
  );
}

export default Footer;
