import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      position="bottom-right"
      offset={24}
      gap={12}
      duration={4000}
      style={{ right: '40px' }}
      toastOptions={{
        unstyled: true,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
