import { BiLoaderAlt } from "react-icons/bi";
import { ComponentProps } from "react";

type LoaderProps = ComponentProps<typeof BiLoaderAlt>;

export const Loader = ({ className = "", ...rest }: LoaderProps) => {
  return (
    <BiLoaderAlt className={`animate-spin ${className}`} {...rest} />
  );
};
